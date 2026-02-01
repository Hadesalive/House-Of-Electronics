/* eslint-disable @typescript-eslint/no-require-imports */
const { ipcMain } = require('electron');
const { executeInTransaction, logTransaction } = require('../services/transaction-service');

function registerReturnHandlers(databaseService, syncService) {
  // Get all returns
  ipcMain.handle('get-returns', async () => {
    try {
      const returns = await databaseService.getReturns();
      return { success: true, data: returns };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Get return by ID
  ipcMain.handle('get-return-by-id', async (event, returnId) => {
    try {
      const returnData = await databaseService.getReturnById(returnId);
      return { success: true, data: returnData };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Get returns for a specific sale
  ipcMain.handle('get-returns-for-sale', async (event, saleId) => {
    try {
      const allReturns = await databaseService.getReturns();
      const saleReturns = allReturns.filter(ret => ret.saleId === saleId);
      return { success: true, data: saleReturns };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Create return
  ipcMain.handle('create-return', async (event, returnData) => {
    try {
      logTransaction('create-return', { 
        itemCount: returnData.items?.length || 0,
        status: returnData.status,
        refundMethod: returnData.refundMethod
      });
      
      // Execute all operations in a single transaction
      const result = await executeInTransaction(databaseService.db, async () => {
        // Step 1: Create the return
        const returnRecord = await databaseService.createReturn(returnData);
        
        // Step 2: If return is completed or approved, restore stock and handle refund
        const updatedProducts = [];
        let updatedCustomer = null;
        let updatedSale = null;
        
        if ((returnData.status === 'completed' || returnData.status === 'approved') && returnData.items && Array.isArray(returnData.items)) {
          // Restore stock for returned items
          for (const item of returnData.items) {
            const product = await databaseService.getProductById(item.productId);
            if (!product) {
              throw new Error(`Product not found: ${item.productId}`);
            }
            
            const currentStock = product.stock || 0;
            const quantityReturned = item.quantity || 0;
            const newStock = currentStock + quantityReturned;
            
            console.log(`Restoring stock for ${product.name}: ${currentStock} -> ${newStock} (returned ${quantityReturned})`);
            
            await databaseService.updateProduct(item.productId, {
              stock: newStock
            });
            
            // Get updated product for sync tracking
            const updatedProduct = await databaseService.getProductById(item.productId);
            if (updatedProduct) {
              updatedProducts.push(updatedProduct);
            }
          }
          
          // If refund method is store credit, add to customer's balance
          if (returnData.refundMethod === 'store_credit' && returnData.customerId) {
            const customer = await databaseService.getCustomerById(returnData.customerId);
            if (!customer) {
              throw new Error(`Customer not found: ${returnData.customerId}`);
            }
            
            const currentCredit = customer.storeCredit || 0;
            const newCredit = currentCredit + returnData.refundAmount;
            
            console.log(`Adding store credit for customer: ${currentCredit} -> ${newCredit}`);
            
            await databaseService.updateCustomer(returnData.customerId, {
              storeCredit: newCredit
            });
            
            // Get updated customer for sync tracking
            updatedCustomer = await databaseService.getCustomerById(returnData.customerId);
          }
          
          // Step 3: Update sale status based on return amount and refund method
          if (returnData.saleId) {
            const sale = await databaseService.getSaleById(returnData.saleId);
            if (sale) {
              // Calculate total returns for this sale
              const allReturns = await databaseService.getReturns();
              const saleReturns = allReturns.filter(ret => 
                ret.saleId === returnData.saleId && 
                ['completed', 'approved'].includes(ret.status)
              );
              
              const totalReturnedAmount = saleReturns.reduce((sum, ret) => sum + ret.refundAmount, 0);
              const totalSaleAmount = sale.total;
              
              // Determine new sale status
              let newSaleStatus = sale.status;
              
              if (totalReturnedAmount >= totalSaleAmount) {
                // Fully refunded
                if (returnData.refundMethod === 'cash' || returnData.refundMethod === 'original_payment') {
                  newSaleStatus = 'refunded';
                } else {
                  // Store credit refund - keep as completed but mark as having store credit
                  newSaleStatus = 'completed';
                }
              } else if (totalReturnedAmount > 0) {
                // Partially refunded - keep as completed but will show partial refund
                newSaleStatus = 'completed';
              }
              
              if (newSaleStatus !== sale.status) {
                console.log(`Updating sale ${returnData.saleId} status: ${sale.status} -> ${newSaleStatus}`);
                updatedSale = await databaseService.updateSale(returnData.saleId, { status: newSaleStatus });
              }
            }
          }
        }
        
        return { returnRecord, updatedProducts, updatedCustomer, updatedSale };
      });
      
      // Track sync changes
      if (syncService && result.returnRecord && result.returnRecord.id) {
        // Track return creation
        syncService.trackChange('returns', result.returnRecord.id.toString(), 'create', result.returnRecord);
        
        // Track product stock updates (stock was restored)
        if (result.updatedProducts && result.updatedProducts.length > 0) {
          for (const product of result.updatedProducts) {
            syncService.trackChange('products', product.id.toString(), 'update', product);
          }
        }
        
        // Track customer update (store credit was added)
        if (result.updatedCustomer && result.updatedCustomer.id) {
          syncService.trackChange('customers', result.updatedCustomer.id.toString(), 'update', result.updatedCustomer);
        }
        
        // Track sale update (status changed)
        if (result.updatedSale && result.updatedSale.id) {
          syncService.trackChange('sales', result.updatedSale.id.toString(), 'update', result.updatedSale);
        }
      }
      
      return { success: true, data: result.returnRecord };
    } catch (error) {
      console.error('create-return transaction failed:', error);
      return { success: false, error: error.message };
    }
  });

  // Update return
  ipcMain.handle('update-return', async (event, payload) => {
    try {
      const { id, updates } = payload;
      logTransaction('update-return', { 
        returnId: id,
        statusChange: updates.status,
        hasItemsUpdate: !!(updates.items && Array.isArray(updates.items))
      });
      
      // Execute all operations in a single transaction
      const result = await executeInTransaction(databaseService.db, async () => {
        // Step 1: Get original return
        const originalReturn = await databaseService.getReturnById(id);
        if (!originalReturn) {
          throw new Error('Return not found');
        }
        
        // Step 2: If status changed to completed/approved from pending/rejected, restore stock
        const updatedProducts = [];
        let updatedCustomer = null;
        let updatedSale = null;
        
        if (updates.status && (updates.status === 'completed' || updates.status === 'approved')) {
          if (originalReturn.status !== 'completed' && originalReturn.status !== 'approved') {
            const items = updates.items || originalReturn.items;
            
            if (items && Array.isArray(items)) {
              // Restore stock for returned items
              for (const item of items) {
                const product = await databaseService.getProductById(item.productId);
                if (!product) {
                  throw new Error(`Product not found: ${item.productId}`);
                }
                
                const currentStock = product.stock || 0;
                const quantityReturned = item.quantity || 0;
                const newStock = currentStock + quantityReturned;
                
                console.log(`Restoring stock for ${product.name}: ${currentStock} -> ${newStock} (returned ${quantityReturned})`);
                
                await databaseService.updateProduct(item.productId, {
                  stock: newStock
                });
                
                // Get updated product for sync tracking
                const updatedProduct = await databaseService.getProductById(item.productId);
                if (updatedProduct) {
                  updatedProducts.push(updatedProduct);
                }
              }
              
              // Handle store credit if refund method is store_credit
              const refundMethod = updates.refundMethod || originalReturn.refundMethod;
              const customerId = updates.customerId || originalReturn.customerId;
              const refundAmount = updates.refundAmount || originalReturn.refundAmount;
              
              if (refundMethod === 'store_credit' && customerId) {
                const customer = await databaseService.getCustomerById(customerId);
                if (!customer) {
                  throw new Error(`Customer not found: ${customerId}`);
                }
                
                const currentCredit = customer.storeCredit || 0;
                const newCredit = currentCredit + refundAmount;
                
                console.log(`Adding store credit for customer: ${currentCredit} -> ${newCredit}`);
                
                await databaseService.updateCustomer(customerId, {
                  storeCredit: newCredit
                });
                
                // Get updated customer for sync tracking
                updatedCustomer = await databaseService.getCustomerById(customerId);
              }
            }
          }
        }
        
        // Step 3: Update the return
        const returnRecord = await databaseService.updateReturn(id, updates);
        
        // Check if sale status needs updating (similar to create-return logic)
        if (returnRecord.saleId) {
          const sale = await databaseService.getSaleById(returnRecord.saleId);
          if (sale) {
            const allReturns = await databaseService.getReturns();
            const saleReturns = allReturns.filter(ret => 
              ret.saleId === returnRecord.saleId && 
              ['completed', 'approved'].includes(ret.status)
            );
            
            const totalReturnedAmount = saleReturns.reduce((sum, ret) => sum + ret.refundAmount, 0);
            const totalSaleAmount = sale.total;
            
            let newSaleStatus = sale.status;
            
            if (totalReturnedAmount >= totalSaleAmount) {
              if (returnRecord.refundMethod === 'cash' || returnRecord.refundMethod === 'original_payment') {
                newSaleStatus = 'refunded';
              } else {
                newSaleStatus = 'completed';
              }
            } else if (totalReturnedAmount > 0) {
              newSaleStatus = 'completed';
            }
            
            if (newSaleStatus !== sale.status) {
              updatedSale = await databaseService.updateSale(returnRecord.saleId, { status: newSaleStatus });
            }
          }
        }
        
        return { returnRecord, updatedProducts, updatedCustomer, updatedSale };
      });
      
      // Track sync changes
      if (syncService && result.returnRecord && result.returnRecord.id) {
        // Track return update
        syncService.trackChange('returns', result.returnRecord.id.toString(), 'update', result.returnRecord);
        
        // Track product stock updates (stock was restored)
        if (result.updatedProducts && result.updatedProducts.length > 0) {
          for (const product of result.updatedProducts) {
            syncService.trackChange('products', product.id.toString(), 'update', product);
          }
        }
        
        // Track customer update (store credit was added)
        if (result.updatedCustomer && result.updatedCustomer.id) {
          syncService.trackChange('customers', result.updatedCustomer.id.toString(), 'update', result.updatedCustomer);
        }
        
        // Track sale update (status changed)
        if (result.updatedSale && result.updatedSale.id) {
          syncService.trackChange('sales', result.updatedSale.id.toString(), 'update', result.updatedSale);
        }
      }
      
      return { success: true, data: result.returnRecord };
      
      return { success: true, data: result };
    } catch (error) {
      console.error('update-return transaction failed:', error);
      return { success: false, error: error.message };
    }
  });

  // Delete return
  ipcMain.handle('delete-return', async (event, returnId) => {
    try {
      console.log('Deleting return:', returnId);
      
      // Get return to check if we need to remove restored stock
      const returnRecord = await databaseService.getReturnById(returnId);
      
      const updatedProducts = [];
      let updatedCustomer = null;
      let updatedSale = null;
      
      // If return was completed/approved, remove the stock that was restored
      if (returnRecord && (returnRecord.status === 'completed' || returnRecord.status === 'approved')) {
        if (returnRecord.items && Array.isArray(returnRecord.items)) {
          for (const item of returnRecord.items) {
            try {
              const product = await databaseService.getProductById(item.productId);
              if (product) {
                const currentStock = product.stock || 0;
                const quantityToRemove = item.quantity || 0;
                const newStock = Math.max(0, currentStock - quantityToRemove);
                
                console.log(`Removing restored stock for ${product.name}: ${currentStock} -> ${newStock} (removed ${quantityToRemove})`);
                
                await databaseService.updateProduct(item.productId, {
                  stock: newStock
                });
                
                // Get updated product for sync tracking
                const updatedProduct = await databaseService.getProductById(item.productId);
                if (updatedProduct) {
                  updatedProducts.push(updatedProduct);
                }
              }
            } catch (stockError) {
              console.error(`Error removing stock for product ${item.productId}:`, stockError);
            }
          }
        }
        
        // If store credit was added, remove it
        if (returnRecord.refundMethod === 'store_credit' && returnRecord.customerId) {
          try {
            const customer = await databaseService.getCustomerById(returnRecord.customerId);
            if (customer) {
              const currentCredit = customer.storeCredit || 0;
              const newCredit = Math.max(0, currentCredit - returnRecord.refundAmount);
              
              console.log(`Removing store credit for customer: ${currentCredit} -> ${newCredit}`);
              
              await databaseService.updateCustomer(returnRecord.customerId, {
                storeCredit: newCredit
              });
              
              // Get updated customer for sync tracking
              updatedCustomer = await databaseService.getCustomerById(returnRecord.customerId);
            }
          } catch (creditError) {
            console.error(`Error removing store credit:`, creditError);
          }
        }
        
        // Check if sale status needs updating after return deletion
        if (returnRecord.saleId) {
          try {
            const sale = await databaseService.getSaleById(returnRecord.saleId);
            if (sale) {
              const allReturns = await databaseService.getReturns();
              const saleReturns = allReturns.filter(ret => 
                ret.saleId === returnRecord.saleId && 
                ret.id !== returnId && // Exclude the return being deleted
                ['completed', 'approved'].includes(ret.status)
              );
              
              const totalReturnedAmount = saleReturns.reduce((sum, ret) => sum + ret.refundAmount, 0);
              const totalSaleAmount = sale.total;
              
              let newSaleStatus = sale.status;
              
              // If no returns left or amount is less than total, sale should not be refunded
              if (totalReturnedAmount === 0 && sale.status === 'refunded') {
                newSaleStatus = 'completed'; // Revert from refunded to completed
              } else if (totalReturnedAmount < totalSaleAmount && sale.status === 'refunded') {
                newSaleStatus = 'completed'; // Partial refunds don't make it fully refunded
              }
              
              if (newSaleStatus !== sale.status) {
                updatedSale = await databaseService.updateSale(returnRecord.saleId, { status: newSaleStatus });
              }
            }
          } catch (saleError) {
            console.error(`Error updating sale status:`, saleError);
          }
        }
      }
      
      await databaseService.deleteReturn(returnId);
      
      // Track sync changes
      if (syncService) {
        // Track return deletion
        syncService.trackChange('returns', returnId.toString(), 'delete');
        
        // Track product stock updates (stock was removed)
        if (updatedProducts.length > 0) {
          for (const product of updatedProducts) {
            syncService.trackChange('products', product.id.toString(), 'update', product);
          }
        }
        
        // Track customer update (store credit was removed)
        if (updatedCustomer && updatedCustomer.id) {
          syncService.trackChange('customers', updatedCustomer.id.toString(), 'update', updatedCustomer);
        }
        
        // Track sale update (status changed)
        if (updatedSale && updatedSale.id) {
          syncService.trackChange('sales', updatedSale.id.toString(), 'update', updatedSale);
        }
      }
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  console.log('Return handlers registered');
}

module.exports = {
  registerReturnHandlers
};

