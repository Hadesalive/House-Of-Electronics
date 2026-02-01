/* eslint-disable @typescript-eslint/no-require-imports */
const { ipcMain } = require('electron');
const { executeInTransaction, validateTransaction, logTransaction } = require('../services/transaction-service');

function registerSalesHandlers(databaseService, syncService) {
  // Sales-related IPC handlers
  ipcMain.handle('get-sales', async () => {
    try {
      // Safety check: ensure databaseService is available and has getSales method
      if (!databaseService) {
        return { success: false, error: 'Database service not available' };
      }
      
      if (typeof databaseService.getSales !== 'function') {
        return { success: false, error: 'getSales method not available on database service' };
      }
      
      const sales = await databaseService.getSales();
      return { success: true, data: sales || [] };
    } catch (error) {
      console.error('get-sales error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('create-sale', async (event, saleData) => {
    try {
      logTransaction('create-sale', { 
        itemCount: saleData.items?.length || 0,
        customerId: saleData.customerId 
      });
      
      // Validate input data
      if (!saleData.items || !Array.isArray(saleData.items) || saleData.items.length === 0) {
        return {
          success: false,
          error: 'Sale must contain at least one item'
        };
      }

      // Execute all operations in a single transaction
      const result = await executeInTransaction(databaseService.db, async () => {
        // Step 1: Validate stock availability (read-only validation)
        const stockWarnings = [];
        const stockValidation = [];
        
        for (const item of saleData.items) {
          const product = await databaseService.getProductById(item.productId);
          if (!product) {
            throw new Error(`Product "${item.productName}" not found`);
          }
          
          const currentStock = product.stock || 0;
          const quantityRequested = item.quantity || 0;
          
          if (currentStock < quantityRequested) {
            // Allow negative stock with warning (backorder support)
            stockWarnings.push({
              product: product.name,
              available: currentStock,
              requested: quantityRequested,
              backorder: quantityRequested - currentStock
            });
          }
          
          stockValidation.push({
            productId: item.productId,
            currentStock,
            quantityRequested
          });
        }
        
        // Step 2: Deduct stock for each item
        for (const validation of stockValidation) {
          const newStock = validation.currentStock - validation.quantityRequested;
          
          console.log(`Updating stock for product ${validation.productId}: ${validation.currentStock} -> ${newStock}`);
          
          await databaseService.updateProduct(validation.productId, {
            stock: newStock
          });
        }
        
        // Step 3: Create the sale with backorder information
        const saleDataWithBackorder = {
          ...saleData,
          has_backorder: stockWarnings.length > 0 ? 1 : 0,
          backorder_details: stockWarnings.length > 0 ? JSON.stringify(stockWarnings) : null
        };
        
        const sale = await databaseService.createSale(saleDataWithBackorder);
        
        return { sale, stockWarnings };
      });
      
      // Track sync changes
      if (syncService && result.sale && result.sale.id) {
        // Track sale creation
        syncService.trackChange('sales', result.sale.id.toString(), 'create', result.sale);
        
        // Track product stock updates (products were modified during sale creation)
        if (saleData.items && Array.isArray(saleData.items)) {
          for (const item of saleData.items) {
            try {
              const product = await databaseService.getProductById(item.productId);
              if (product) {
                syncService.trackChange('products', product.id.toString(), 'update', product);
              }
            } catch (err) {
              console.warn(`Could not track product ${item.productId} update:`, err.message);
            }
          }
        }
      }
      
      // Return success with warnings if any
      const response = { 
        success: true, 
        data: result.sale 
      };
      
      if (result.stockWarnings.length > 0) {
        response.warnings = result.stockWarnings;
        console.warn('Sale created with stock warnings:', result.stockWarnings);
      }
      
      return response;
    } catch (error) {
      console.error('create-sale transaction failed:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('update-sale', async (event, payload) => {
    try {
      const { id, updates } = payload;
      logTransaction('update-sale', { 
        saleId: id,
        hasItemsUpdate: !!(updates.items && Array.isArray(updates.items))
      });
      
      // If items are being updated, we need to adjust stock
      if (updates.items && Array.isArray(updates.items)) {
        // Execute stock adjustment and sale update in a single transaction
        const result = await executeInTransaction(databaseService.db, async () => {
          // Step 1: Get the original sale to see what was previously sold
          const originalSale = await databaseService.getSaleById(id);
          if (!originalSale) {
            throw new Error('Sale not found');
          }
          
          // Step 2: Calculate stock differences
          const stockChanges = new Map();
          const stockWarnings = [];
          
          // Process original items (restore stock)
          if (originalSale.items && Array.isArray(originalSale.items)) {
            for (const originalItem of originalSale.items) {
              const product = await databaseService.getProductById(originalItem.productId);
              if (product) {
                const currentStock = product.stock || 0;
                const quantityToRestore = originalItem.quantity || 0;
                const restoredStock = currentStock + quantityToRestore;
                
                stockChanges.set(originalItem.productId, {
                  product,
                  currentStock: restoredStock,
                  change: quantityToRestore
                });
                
                console.log(`Restoring stock for ${product.name}: ${currentStock} -> ${restoredStock} (restored ${quantityToRestore})`);
              }
            }
          }
          
          // Process new items (validate and prepare to deduct)
          for (const newItem of updates.items) {
            const product = await databaseService.getProductById(newItem.productId);
            if (!product) {
              throw new Error(`Product "${newItem.productName}" not found`);
            }
            
            const currentStock = stockChanges.get(newItem.productId)?.currentStock || product.stock || 0;
            const quantityRequested = newItem.quantity || 0;
            
            if (currentStock < quantityRequested) {
              // Allow negative stock with warning (backorder support)
              stockWarnings.push({
                product: product.name,
                available: currentStock,
                requested: quantityRequested,
                backorder: quantityRequested - currentStock
              });
            }
            
            const newStock = currentStock - quantityRequested;
            stockChanges.set(newItem.productId, {
              product,
              currentStock: newStock,
              change: quantityRequested
            });
            
            console.log(`Preparing to deduct stock for ${product.name}: ${currentStock} -> ${newStock} (deduct ${quantityRequested})`);
          }
          
          // Step 3: Apply all stock changes
          const updatedProducts = [];
          for (const [productId, change] of stockChanges) {
            await databaseService.updateProduct(productId, {
              stock: change.currentStock
            });
            // Track product for sync
            const product = await databaseService.getProductById(productId);
            if (product) {
              updatedProducts.push(product);
            }
          }
          
          // Step 4: Update the sale
          const sale = await databaseService.updateSale(id, updates);
          
          return { sale, stockWarnings, updatedProducts };
        });
        
        // Return success with warnings if any
        const response = { 
          success: true, 
          data: result.sale 
        };
        
        if (result.stockWarnings.length > 0) {
          response.warnings = result.stockWarnings;
          console.warn('Sale updated with stock warnings:', result.stockWarnings);
        }
        
        // Track sync changes
        if (syncService && result.sale && result.sale.id) {
          // Track sale update
          syncService.trackChange('sales', result.sale.id.toString(), 'update', result.sale);
          
          // Track product stock updates
          if (result.updatedProducts && result.updatedProducts.length > 0) {
            for (const product of result.updatedProducts) {
              syncService.trackChange('products', product.id.toString(), 'update', product);
            }
          }
        }
        
        return response;
      } else {
        // No items update, just update the sale
        const sale = await databaseService.updateSale(id, updates);
        // Track sync change
        if (syncService && sale && sale.id) {
          syncService.trackChange('sales', sale.id.toString(), 'update', sale);
        }
        return { success: true, data: sale };
      }
    } catch (error) {
      console.error('update-sale transaction failed:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('delete-sale', async (event, saleId) => {
    try {
      console.log('Deleting sale and restoring stock:', saleId);
      
      // Get the sale to restore stock before deleting
      const sale = await databaseService.getSaleById(saleId);
      
      const updatedProducts = [];
      if (sale && sale.items && Array.isArray(sale.items)) {
        // Restore stock for each item
        for (const item of sale.items) {
          try {
            const product = await databaseService.getProductById(item.productId);
            if (product) {
              const currentStock = product.stock || 0;
              const quantityToRestore = item.quantity || 0;
              const restoredStock = currentStock + quantityToRestore;
              
              console.log(`Restoring stock for ${product.name}: ${currentStock} -> ${restoredStock} (restored ${quantityToRestore})`);
              
              await databaseService.updateProduct(item.productId, {
                stock: restoredStock
              });
              
              // Get updated product for sync tracking
              const updatedProduct = await databaseService.getProductById(item.productId);
              if (updatedProduct) {
                updatedProducts.push(updatedProduct);
              }
            }
          } catch (restoreError) {
            console.error(`Error restoring stock for product ${item.productId}:`, restoreError);
          }
        }
      }
      
      // Delete the sale
      await databaseService.deleteSale(saleId);
      
      // Track sync changes
      if (syncService) {
        // Track sale deletion
        syncService.trackChange('sales', saleId.toString(), 'delete');
        
        // Track product stock updates (stock was restored)
        if (updatedProducts.length > 0) {
          for (const product of updatedProducts) {
            syncService.trackChange('products', product.id.toString(), 'update', product);
          }
        }
      }
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-sale-by-id', async (event, saleId) => {
    try {
      const sale = await databaseService.getSaleById(saleId);
      return { success: true, data: sale };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Invoice-related handlers
  ipcMain.handle('generate-invoice', async (event, saleId) => {
    try {
      const invoice = await databaseService.generateInvoice(saleId);
      return { success: true, data: invoice };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('print-receipt', async (event, saleId) => {
    try {
      await databaseService.printReceipt(saleId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Apply customer store credit to sale
  ipcMain.handle('apply-customer-credit-to-sale', async (event, payload) => {
    try {
      const { saleId, customerId, creditAmount } = payload;
      
      console.log('Applying customer credit to sale:', { saleId, customerId, creditAmount });
      
      // Get customer and validate credit
      const customer = await databaseService.getCustomerById(customerId);
      if (!customer) {
        return { success: false, error: 'Customer not found' };
      }
      
      const availableCredit = customer.storeCredit || 0;
      if (availableCredit <= 0) {
        return { success: false, error: 'Customer has no store credit available' };
      }
      
      if (creditAmount > availableCredit) {
        return { success: false, error: `Only ${availableCredit} credit available` };
      }
      
      // Get sale
      const sale = await databaseService.getSaleById(saleId);
      if (!sale) {
        return { success: false, error: 'Sale not found' };
      }
      
      // For sales, credit reduces the total amount (acts as discount)
      // Update customer credit
      const newCustomerCredit = availableCredit - creditAmount;
      await databaseService.updateCustomer(customerId, {
        storeCredit: newCustomerCredit
      });
      
      // Add note about credit applied
      const creditNote = `Store credit applied: ${creditAmount}`;
      const existingNotes = sale.notes || '';
      const updatedNotes = existingNotes ? `${existingNotes}\n${creditNote}` : creditNote;
      
      const updatedSale = await databaseService.updateSale(saleId, {
        notes: updatedNotes
      });
      
      // Track sync changes
      if (syncService) {
        // Track sale update (notes changed)
        if (updatedSale && updatedSale.id) {
          syncService.trackChange('sales', updatedSale.id.toString(), 'update', updatedSale);
        }
        // Track customer update (store credit changed)
        const updatedCustomer = await databaseService.getCustomerById(customerId);
        if (updatedCustomer && updatedCustomer.id) {
          syncService.trackChange('customers', updatedCustomer.id.toString(), 'update', updatedCustomer);
        }
      }
      
      console.log('Credit applied to sale successfully:', {
        creditApplied: creditAmount,
        newCustomerCredit
      });
      
      return {
        success: true,
        message: `${creditAmount} credit applied to sale`,
        data: {
          creditApplied: creditAmount,
          remainingCredit: newCustomerCredit
        }
      };
      
    } catch (error) {
      console.error('Error applying customer credit to sale:', error);
      return { success: false, error: error.message };
    }
  });

  console.log('Sales handlers registered');
}

module.exports = {
  registerSalesHandlers
};
