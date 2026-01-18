describe('Requirements model from URL', () => {
  const requirementsUrl =
    'https://gist.githubusercontent.com/pwright/281441c9c07eabe9ef0cd43a27e766de/raw/030d6dd59c2c1e7dbff3b7f565acb24f3cc32c78/requirements.bs';
  beforeEach(() => {
    cy.visit('/index.html');
  });

  it('loads requirements model and captures per-item screenshots', () => {
    cy.viewport(1600, 1000);
    cy.intercept('GET', requirementsUrl, { fixture: 'requirements.bs' }).as('fetchRequirements');

    cy.get('#urlInput').clear().type(requirementsUrl);
    cy.get('#loadUrl').click();

    cy.wait('@fetchRequirements');

    cy.get('#modelList .model-nav-button', { timeout: 20000 }).should('have.length.at.least', 1);
    cy.get('#app .tile', { timeout: 20000 }).should('have.length.at.least', 1);

    cy.screenshot('00-requirements-model', { capture: 'fullPage' });

    cy.get('#app .tile').each(($tile, index, tiles) => {
      cy.wrap($tile).scrollIntoView().click({ force: true });
      cy.window().then((win) => {
        if (typeof win.reflowRects === 'function') {
          win.reflowRects();
        }
        if (typeof win.drawLinks === 'function') {
          win.drawLinks();
        }
      });
      const tileId = $tile.attr('data-id') || `tile-${index}`;
      cy.get('body').then(($body) => {
        const hasPaths = $body.find('#overlay path').length > 0;
        if (hasPaths) {
          cy.get('#overlay path').should('have.length.at.least', 1);
        } else {
          cy.log(`Tile ${tileId} has no visible dependencies`);
        }
      });
      const counter = String(index + 1).padStart(2, '0');
      cy.screenshot(`${counter}-requirements-model-${tileId}`, { capture: 'fullPage' });
      if (index < tiles.length - 1) {
        cy.wait(100);
      }
    });
  });
});
