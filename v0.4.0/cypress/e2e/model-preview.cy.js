describe('Model preview context menu', () => {
  beforeEach(() => {
    cy.visit('/index.html');
  });

  it('opens preview on right-click after switching models', () => {
    cy.get('#itemPreview').should('have.attr', 'hidden');

    cy.get('#modelList button', { timeout: 15000 }).should('have.length.at.least', 2);
    cy.get('#modelList button').eq(1).click();
    cy.get('#modelList button').eq(1).should('have.attr', 'aria-current', 'true');

    cy.get('.tile[data-id="credibility"]', { timeout: 15000 })
      .should('exist')
      .rightclick();

    cy.get('#itemPreview', { timeout: 10000 })
      .should('not.have.attr', 'hidden')
      .and('have.attr', 'aria-hidden', 'false')
      .and('have.class', 'is-visible');

    cy.get('#itemPreview .item-preview__title')
      .should('contain', 'Credibility');

    cy.get('#itemPreview .item-preview__frame')
      .should('exist')
      .invoke('attr', 'srcdoc')
      .should('contain', 'Skupper');

    cy.get('#itemPreview .item-preview__close').click();
    cy.get('#itemPreview').should('have.attr', 'hidden');
  });
});
