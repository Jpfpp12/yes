// Quotation Number Service
// Manages auto-incrementing quotation numbers starting from QT10001

const QUOTATION_COUNTER_KEY = 'quotationCounter';
const STARTING_NUMBER = 10001;

export class QuotationNumberService {
  private static instance: QuotationNumberService;
  
  public static getInstance(): QuotationNumberService {
    if (!QuotationNumberService.instance) {
      QuotationNumberService.instance = new QuotationNumberService();
    }
    return QuotationNumberService.instance;
  }

  private constructor() {
    // Initialize counter if it doesn't exist
    this.initializeCounter();
  }

  private initializeCounter(): void {
    const counter = localStorage.getItem(QUOTATION_COUNTER_KEY);
    if (!counter) {
      localStorage.setItem(QUOTATION_COUNTER_KEY, STARTING_NUMBER.toString());
    }
  }

  public getNextQuotationNumber(): string {
    const currentCounter = this.getCurrentCounter();
    const nextNumber = currentCounter + 1;
    
    // Update the counter in localStorage
    localStorage.setItem(QUOTATION_COUNTER_KEY, nextNumber.toString());
    
    return `QT${nextNumber}`;
  }

  public getCurrentQuotationNumber(): string {
    const currentCounter = this.getCurrentCounter();
    return `QT${currentCounter}`;
  }

  public peekNextQuotationNumber(): string {
    const currentCounter = this.getCurrentCounter();
    return `QT${currentCounter + 1}`;
  }

  private getCurrentCounter(): number {
    const counter = localStorage.getItem(QUOTATION_COUNTER_KEY);
    return counter ? parseInt(counter, 10) : STARTING_NUMBER;
  }

  public resetCounter(startNumber: number = STARTING_NUMBER): void {
    localStorage.setItem(QUOTATION_COUNTER_KEY, startNumber.toString());
  }

  public setCounter(number: number): void {
    if (number >= STARTING_NUMBER) {
      localStorage.setItem(QUOTATION_COUNTER_KEY, number.toString());
    } else {
      throw new Error(`Counter must be >= ${STARTING_NUMBER}`);
    }
  }

  // Get all used quotation numbers (for admin panel)
  public getUsedQuotationNumbers(): string[] {
    const usedQuotations = localStorage.getItem('usedQuotationNumbers');
    return usedQuotations ? JSON.parse(usedQuotations) : [];
  }

  // Mark quotation number as used (when quotation is generated)
  public markQuotationAsUsed(quotationNumber: string): void {
    const usedQuotations = this.getUsedQuotationNumbers();
    if (!usedQuotations.includes(quotationNumber)) {
      usedQuotations.push(quotationNumber);
      localStorage.setItem('usedQuotationNumbers', JSON.stringify(usedQuotations));
    }
  }

  // Generate quotation with metadata
  public generateQuotation(clientInfo: any, files: any[], charges: any): {
    quotationNumber: string;
    timestamp: Date;
    data: any;
  } {
    const quotationNumber = this.getNextQuotationNumber();
    const timestamp = new Date();
    
    const quotationData = {
      quotationNumber,
      timestamp: timestamp.toISOString(),
      clientInfo,
      files,
      charges,
      status: 'generated'
    };

    // Store quotation data
    this.storeQuotationData(quotationData);
    
    // Mark as used
    this.markQuotationAsUsed(quotationNumber);

    return {
      quotationNumber,
      timestamp,
      data: quotationData
    };
  }

  private storeQuotationData(quotationData: any): void {
    const allQuotations = this.getAllQuotations();
    allQuotations.push(quotationData);
    localStorage.setItem('allQuotations', JSON.stringify(allQuotations));
  }

  public getAllQuotations(): any[] {
    const quotations = localStorage.getItem('allQuotations');
    return quotations ? JSON.parse(quotations) : [];
  }

  public getQuotationByNumber(quotationNumber: string): any | null {
    const allQuotations = this.getAllQuotations();
    return allQuotations.find(q => q.quotationNumber === quotationNumber) || null;
  }

  public deleteQuotation(quotationNumber: string): boolean {
    const allQuotations = this.getAllQuotations();
    const filteredQuotations = allQuotations.filter(q => q.quotationNumber !== quotationNumber);
    
    if (filteredQuotations.length < allQuotations.length) {
      localStorage.setItem('allQuotations', JSON.stringify(filteredQuotations));
      
      // Also remove from used quotations
      const usedQuotations = this.getUsedQuotationNumbers();
      const filteredUsed = usedQuotations.filter(q => q !== quotationNumber);
      localStorage.setItem('usedQuotationNumbers', JSON.stringify(filteredUsed));
      
      return true;
    }
    
    return false;
  }

  // Search quotations
  public searchQuotations(searchTerm: string): any[] {
    const allQuotations = this.getAllQuotations();
    const lowercaseSearch = searchTerm.toLowerCase();
    
    return allQuotations.filter(quotation => 
      quotation.quotationNumber.toLowerCase().includes(lowercaseSearch) ||
      quotation.clientInfo.name.toLowerCase().includes(lowercaseSearch) ||
      quotation.clientInfo.email?.toLowerCase().includes(lowercaseSearch) ||
      quotation.clientInfo.phone?.toLowerCase().includes(lowercaseSearch)
    );
  }

  // Get quotations by date range
  public getQuotationsByDateRange(startDate: Date, endDate: Date): any[] {
    const allQuotations = this.getAllQuotations();
    
    return allQuotations.filter(quotation => {
      const quotationDate = new Date(quotation.timestamp);
      return quotationDate >= startDate && quotationDate <= endDate;
    });
  }

  // Export quotations data
  public exportQuotationsData(): string {
    const allQuotations = this.getAllQuotations();
    return JSON.stringify(allQuotations, null, 2);
  }

  // Import quotations data
  public importQuotationsData(jsonData: string): boolean {
    try {
      const quotations = JSON.parse(jsonData);
      if (Array.isArray(quotations)) {
        localStorage.setItem('allQuotations', JSON.stringify(quotations));
        
        // Update used quotations list
        const usedNumbers = quotations.map(q => q.quotationNumber);
        localStorage.setItem('usedQuotationNumbers', JSON.stringify(usedNumbers));
        
        // Update counter to highest number + 1
        const highestNumber = quotations.reduce((max, q) => {
          const num = parseInt(q.quotationNumber.replace('QT', ''), 10);
          return Math.max(max, num);
        }, STARTING_NUMBER);
        
        this.setCounter(highestNumber);
        
        return true;
      }
    } catch (error) {
      console.error('Error importing quotations data:', error);
    }
    
    return false;
  }
}

// Export singleton instance
export const quotationNumberService = QuotationNumberService.getInstance();
