describe("Video Editor E2E", () => {
  beforeEach(() => {
    cy.visit("http://localhost:3000");
    // Reset any previous state
    cy.get("body").then(($body) => {
      if ($body.find('[data-testid="new-video-button"]').length > 0) {
        cy.get('[data-testid="new-video-button"]').click();
      }
    });
  });

  it("completes full video editing workflow", () => {
    // Step 1: Upload Video
    cy.get('[data-testid="upload-dropzone"]').should("be.visible");
    cy.get('input[type="file"]').selectFile("cypress/fixtures/test-video.mov", {
      force: true,
    });

    // Wait for upload to complete and move to ratio selection
    cy.get("h2").contains("Choose Aspect Ratio").should("be.visible");

    // Step 2: Select Aspect Ratio
    cy.get("button").contains("9:16").click();

    // Step 3: Adjust Crop Position
    cy.get('[data-testid="crop-slider"]').should("be.visible");
    cy.get('[data-testid="crop-slider"]').invoke("val", 50);
    cy.get("button").contains("Continue").click();

    // Step 4: Transcription Options
    cy.get("h2").contains("Transcription Options").should("be.visible");
    // cy.get('input[type="checkbox"]').first().check();
    cy.get("button").contains("Continue").click();

    // Since transcription is disabled, we should go directly to processing
    // cy.get("h2", { timeout: 60000 })
    //   .contains("Download Your Video")
    //   .should("be.visible");
    // cy.get("a").contains("Download Video").should("be.visible");
    // cy.get("a").contains("Download SRT").should("not.exist");

    // Step 5: Customize Subtitles
    // Font size
    cy.get('input[type="range"]').first().invoke("val", 24).trigger("change");

    // Font color
    cy.get('input[type="color"]')
      .first()
      .invoke("val", "#ffffff")
      .trigger("change");

    // Border size
    cy.get('input[type="range"]').eq(1).invoke("val", 2).trigger("change");

    // Border color
    cy.get('input[type="color"]')
      .eq(1)
      .invoke("val", "#000000")
      .trigger("change");

    // Vertical position
    cy.get('input[type="range"]').eq(2).invoke("val", 90).trigger("change");

    // Volume
    cy.get('input[type="range"]').eq(3).invoke("val", 100).trigger("change");

    // Save and process
    cy.get("button").contains("Save and Render").click();

    // Step 6: Wait for processing and verify download section
    cy.get("h2", { timeout: 60000 })
      .contains("Download Your Video")
      .should("be.visible");
    cy.get("a").contains("Download Video").should("be.visible");
    cy.get("a").contains("Download SRT").should("be.visible");
  });

  it("handles video upload errors", () => {
    cy.get('[data-testid="upload-dropzone"]').should("be.visible");
    cy.get('input[type="file"]').selectFile("cypress/fixtures/invalid.txt", {
      force: true,
    });
    cy.get(".bg-red-500").should("be.visible");
  });

  it("allows skipping subtitle editing", () => {
    cy.get('[data-testid="upload-dropzone"]').should("be.visible");
    cy.get('input[type="file"]').selectFile("cypress/fixtures/test-video.mov", {
      force: true,
    });
    cy.get("button").contains("9:16").click();
    cy.get('[data-testid="crop-slider"]').should("be.visible");
    cy.get("button").contains("Continue").click();
    cy.get('input[type="checkbox"]').first().uncheck();
    cy.get("button").contains("Continue").click();
    cy.get("h2", { timeout: 60000 })
      .contains("Download Your Video")
      .should("be.visible");
  });

  it("preserves subtitle customization settings", () => {
    // Upload and get to subtitle editing
    cy.get('[data-testid="upload-dropzone"]').should("be.visible");
    cy.get('input[type="file"]').selectFile("cypress/fixtures/test-video.mov", {
      force: true,
    });
    cy.get("button").contains("9:16").click();
    cy.get('[data-testid="crop-slider"]').should("be.visible");
    cy.get("button").contains("Continue").click();
    cy.get('input[type="checkbox"]').first().check();
    cy.get("button").contains("Continue").click();

    // Customize settings
    cy.get("h2")
      .contains("Edit Subtitles", { timeout: 30000 })
      .should("be.visible");
    cy.get('input[type="range"]').first().invoke("val", 24).trigger("change");
    cy.get('input[type="range"]').eq(3).invoke("val", 150).trigger("change");

    // Process video
    cy.get("button").contains("Save and Render").click();

    // Start new video and verify settings are preserved
    cy.get("h2", { timeout: 60000 })
      .contains("Download Your Video")
      .should("be.visible");
    cy.get('[data-testid="new-video-button"]').click();

    // Complete flow again
    cy.get('input[type="file"]').selectFile("cypress/fixtures/test-video.mov", {
      force: true,
    });
    cy.get("button").contains("9:16").click();
    cy.get("button").contains("Continue").click();
    cy.get('input[type="checkbox"]').first().check();
    cy.get("button").contains("Continue").click();

    // Verify settings were preserved
    cy.get("h2")
      .contains("Edit Subtitles", { timeout: 30000 })
      .should("be.visible");
    cy.get('input[type="range"]').first().should("have.value", "24");
    cy.get('input[type="range"]').eq(3).should("have.value", "150");
  });
});
