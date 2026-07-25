export interface IndustryTemplate {
  slug: string;
  label: string;
  /** Core services a business in this trade is expected to have dedicated pages for. */
  expectedServices: string[];
  /** Whether 24/7 or same-day emergency service is a normal market expectation. */
  emergencyServiceExpected: boolean;
  /** Trust/certification signals to look for (licensing bodies, associations, etc). */
  trustSignals: string[];
  financingRelevant: boolean;
  maintenancePlanRelevant: boolean;
  /** Conversion actions this trade's customers typically take. */
  conversionActions: string[];
  /** Keyword signals used to classify crawled pages (service, location, other). */
  keywordSignals: {
    service: string[];
    emergency: string[];
    financing: string[];
    maintenancePlan: string[];
    trust: string[];
  };
}
