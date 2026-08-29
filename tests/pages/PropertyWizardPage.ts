import { Page, Locator, expect } from '@playwright/test';

export class PropertyWizardPage {
  readonly page: Page;
  readonly addressInput: Locator;
  readonly suburbInput: Locator;
  readonly postcodeInput: Locator;
  readonly stateSelect: Locator;
  readonly propertyCategorySelect: Locator;
  readonly propertyTypeSelect: Locator;
  readonly bedroomsInput: Locator;
  readonly bathroomsInput: Locator;
  readonly carSpacesInput: Locator;
  readonly rentAmountInput: Locator;
  readonly nextButton: Locator;
  readonly backButton: Locator;
  readonly submitButton: Locator;
  readonly toastError: Locator;

  constructor(page: Page) {
    this.page = page;
    this.addressInput = page.locator('input[name="address"]');
    this.suburbInput = page.locator('input[name="suburb"]');
    this.postcodeInput = page.locator('input[name="postcode"]');
    this.stateSelect = page.locator('select[name="state"]');
    this.propertyCategorySelect = page.locator('select[name="propertyCategory"]');
    this.propertyTypeSelect = page.locator('select[name="propertyType"]');
    this.bedroomsInput = page.locator('input[name="bedrooms"]');
    this.bathroomsInput = page.locator('input[name="bathrooms"]');
    this.carSpacesInput = page.locator('input[name="carSpaces"]');
    this.rentAmountInput = page.locator('input[name="rentAmount"]');
    this.nextButton = page.locator('button:has-text("Proceed to Next")');
    this.backButton = page.locator('button:has-text("Previous Step")');
    this.submitButton = page.locator('button:has-text("Save Property")');
    this.toastError = page.locator('text=Validation Failed');
  }

  async fillStep1Location(address: string, suburb: string, postcode: string, state = 'NSW', type = 'House') {
    await this.addressInput.fill(address);
    await this.suburbInput.fill(suburb);
    await this.postcodeInput.fill(postcode);
    await this.stateSelect.selectOption(state);
    await this.propertyTypeSelect.selectOption(type);
  }

  async fillStep2Features(bedrooms = '2', bathrooms = '1', carSpaces = '1', rentAmount = '600') {
    await this.bedroomsInput.fill(bedrooms);
    await this.bathroomsInput.fill(bathrooms);
    await this.carSpacesInput.fill(carSpaces);
    await this.rentAmountInput.fill(rentAmount);
  }

  async next() {
    await this.nextButton.click();
  }

  async submit() {
    await this.submitButton.click();
  }
}
