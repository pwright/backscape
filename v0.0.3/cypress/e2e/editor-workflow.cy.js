describe('Editor CRUD workflow', () => {
  beforeEach(() => {
    cy.visit('/editor.html');
  });

  it('loads JSON, manages categories/items, and supports reordering', () => {
    cy.readFile('NFR.json').then((data) => {
      cy.get('#fileInput').selectFile(
        {
          contents: Cypress.Buffer.from(JSON.stringify(data)),
          fileName: 'NFR.json',
          mimeType: 'application/json'
        },
        { force: true }
      );

      cy.contains('#status', 'Loaded', { timeout: 10000 }).should('be.visible');

      cy.get('#categories .cat')
        .should('have.length', data.categories.length)
        .first()
        .find('.cat-title-text')
        .should('have.text', data.categories[0].title);

      cy.get('#addCategoryBtn').click();

      cy.get('#categories .cat').should('have.length', data.categories.length + 1);

      cy.get('#detailPanel .field-label')
        .contains('Title')
        .parent()
        .find('input')
        .clear()
        .type('Test Category')
        .blur();

      cy.get('#detailPanel .field-label')
        .contains('ID')
        .parent()
        .find('input')
        .clear()
        .type('test-category')
        .blur();

      const testCategorySelector = '#categories .cat[data-cat-id="test-category"]';

      cy.get(testCategorySelector).should('exist');

      cy.get('#addItemBtn').click();
      cy.get('#addItemBtn').click();

      cy.get('#detailPanel .field-label')
        .contains('Name')
        .parent()
        .find('input')
        .clear()
        .type('Second Item');

      cy.get('#detailPanel .field-label')
        .contains('ID')
        .parent()
        .find('input')
        .clear()
        .type('second-item');

      cy.get(testCategorySelector).find('.item').should('have.length', 2);

      cy.get(testCategorySelector).find('.item').first().click();

      cy.get('#detailPanel .field-label')
        .contains('Name')
        .parent()
        .find('input')
        .clear()
        .type('First Item');

      cy.get('#detailPanel .field-label')
        .contains('ID')
        .parent()
        .find('input')
        .clear()
        .type('first-item');

      cy.get(testCategorySelector)
        .find('.item')
        .eq(1)
        .find('[aria-label="Move item up"]')
        .click();

      cy.get(testCategorySelector)
        .find('.item-name')
        .then(($names) => {
          const texts = [...$names].map((el) => el.textContent.trim());
          expect(texts[0]).to.eq('Second Item');
          expect(texts[1]).to.eq('First Item');
        });

      let dataTransfer;
      cy.window().then((win) => {
        dataTransfer = new win.DataTransfer();
      });

      cy.get(testCategorySelector).trigger('dragstart', { dataTransfer });
      cy.get('#categories .cat').first().trigger('dragover', { dataTransfer }).trigger('drop', { dataTransfer });

      cy.get('#categories .cat').first().should('have.attr', 'data-cat-id', 'test-category');

      cy.on('window:confirm', () => true);
      cy.get(testCategorySelector).find('.item').last().click();
      cy.contains('#detailPanel button', 'Delete item').click();

      cy.get(testCategorySelector).find('.item').should('have.length', 1);

      cy.get('#jsonArea')
        .should('contain', '"test-category"')
        .and('contain', '"second-item"')
        .and('not.contain', '"first-item"');

      cy.get('#validateBtn').click();
      cy.contains('#status', 'Validation OK', { timeout: 10000 }).should('be.visible');
    });
  });
});
