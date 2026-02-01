import { SalesData, Customer, Product, Sale, CompanySettings } from '@/types';

class StorageService {
    private data: SalesData | null = null;
    private listeners: Array<(data: SalesData) => void> = [];

    constructor() {
        this.initializeData();
    }

    private async initializeData() {
        try {
            if (typeof window !== 'undefined' && window.electronAPI) {
                const result = await window.electronAPI.loadData();
                if (result.success && result.data) {
                    this.data = { ...this.getDefaultData(), ...result.data };
                } else {
                    this.data = this.getDefaultData();
                }
            } else {
                // Fallback for web development
                this.data = this.getDefaultData();
            }
            this.notifyListeners();
        } catch (error) {
            console.error('Failed to initialize data:', error);
            this.data = this.getDefaultData();
            this.notifyListeners();
        }
    }

    private getDefaultData(): SalesData {
        return {
            customers: [],
            products: [],
            sales: [],
            settings: {
                companyName: 'House Of Electronics S/L LTD',
                address: '',
                phone: '',
                email: '',
                taxRate: 0.15,
                currency: 'USD'
            }
        };
    }

    private async saveToFile() {
        if (this.data && typeof window !== 'undefined' && window.electronAPI) {
            try {
                const result = await window.electronAPI.saveData(this.data);
                if (!result.success) {
                    console.error('Failed to save data:', result.error);
                }
            } catch (error) {
                console.error('Error saving data:', error);
            }
        }
    }

    private notifyListeners() {
        if (this.data) {
            this.listeners.forEach(listener => listener(this.data!));
        }
    }

    public subscribe(listener: (data: SalesData) => void) {
        this.listeners.push(listener);
        if (this.data) {
            listener(this.data);
        }
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    public getData(): SalesData | null {
        return this.data;
    }

    // Customer operations
    public async addCustomer(customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) {
        if (!this.data) return null;

        const newCustomer: Customer = {
            ...customer,
            id: this.generateId(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.data.customers.push(newCustomer);
        await this.saveToFile();
        this.notifyListeners();
        return newCustomer;
    }

    public async updateCustomer(id: string, updates: Partial<Customer>) {
        if (!this.data) return null;

        const index = this.data.customers.findIndex(c => c.id === id);
        if (index === -1) return null;

        this.data.customers[index] = {
            ...this.data.customers[index],
            ...updates,
            updatedAt: new Date().toISOString()
        };

        await this.saveToFile();
        this.notifyListeners();
        return this.data.customers[index];
    }

    public async deleteCustomer(id: string) {
        if (!this.data) return false;

        this.data.customers = this.data.customers.filter(c => c.id !== id);
        await this.saveToFile();
        this.notifyListeners();
        return true;
    }

    // Product operations
    public async addProduct(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) {
        if (!this.data) return null;

        const newProduct: Product = {
            ...product,
            id: this.generateId(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.data.products.push(newProduct);
        await this.saveToFile();
        this.notifyListeners();
        return newProduct;
    }

    public async updateProduct(id: string, updates: Partial<Product>) {
        if (!this.data) return null;

        const index = this.data.products.findIndex(p => p.id === id);
        if (index === -1) return null;

        this.data.products[index] = {
            ...this.data.products[index],
            ...updates,
            updatedAt: new Date().toISOString()
        };

        await this.saveToFile();
        this.notifyListeners();
        return this.data.products[index];
    }

    public async deleteProduct(id: string) {
        if (!this.data) return false;

        this.data.products = this.data.products.filter(p => p.id !== id);
        await this.saveToFile();
        this.notifyListeners();
        return true;
    }

    // Sale operations
    public async addSale(sale: Omit<Sale, 'id' | 'createdAt' | 'updatedAt'>) {
        if (!this.data) return null;

        const newSale: Sale = {
            ...sale,
            id: this.generateId(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // Update product stock
        for (const item of newSale.items) {
            const product = this.data.products.find(p => p.id === item.productId);
            if (product) {
                product.stock -= item.quantity;
                product.updatedAt = new Date().toISOString();
            }
        }

        this.data.sales.push(newSale);
        await this.saveToFile();
        this.notifyListeners();
        return newSale;
    }

    public async updateSale(id: string, updates: Partial<Sale>) {
        if (!this.data) return null;

        const index = this.data.sales.findIndex(s => s.id === id);
        if (index === -1) return null;

        this.data.sales[index] = {
            ...this.data.sales[index],
            ...updates,
            updatedAt: new Date().toISOString()
        };

        await this.saveToFile();
        this.notifyListeners();
        return this.data.sales[index];
    }

    public async deleteSale(id: string) {
        if (!this.data) return false;

        const sale = this.data.sales.find(s => s.id === id);
        if (sale) {
            // Restore product stock
            for (const item of sale.items) {
                const product = this.data.products.find(p => p.id === item.productId);
                if (product) {
                    product.stock += item.quantity;
                    product.updatedAt = new Date().toISOString();
                }
            }
        }

        this.data.sales = this.data.sales.filter(s => s.id !== id);
        await this.saveToFile();
        this.notifyListeners();
        return true;
    }

    // Settings operations
    public async updateSettings(settings: Partial<CompanySettings>) {
        if (!this.data) return null;

        this.data.settings = {
            ...this.data.settings,
            ...settings
        };

        await this.saveToFile();
        this.notifyListeners();
        return this.data.settings;
    }

    // Export/Import operations
    public async exportData() {
        if (typeof window !== 'undefined' && window.electronAPI) {
            return await window.electronAPI.exportData();
        }
        return { success: false, error: 'Export not available in web mode' };
    }

    public async importData() {
        if (typeof window !== 'undefined' && window.electronAPI) {
            const result = await window.electronAPI.importData();
            if (result.success && result.data) {
                this.data = { ...this.getDefaultData(), ...result.data };
                this.notifyListeners();
            }
            return result;
        }
        return { success: false, error: 'Import not available in web mode' };
    }

    private generateId(): string {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
}

export const storageService = new StorageService();
