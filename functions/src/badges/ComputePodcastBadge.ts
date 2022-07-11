import * as functions from "firebase-functions";

/*
 * Compute a new badge for a podcast

 * Required data : 
  - Total fraction minter par rarete
  - Rarete des fractions 
  - Nbr d'écoute sur une semaine pour user avec wallet -> peut etre a ponderer par rarete de fraction (check si possible de balancer l'event complet)
  - Nbr d'écoute 
 */
export default () =>
  functions
    .region("europe-west3")
    .pubsub.schedule("0 0 * * 1") // Run every week on monday
    .onRun(async () => {
      functions.logger.info("Started the podcast badges update");
      functions.logger.info("Finished the podcast badges update");
    });
