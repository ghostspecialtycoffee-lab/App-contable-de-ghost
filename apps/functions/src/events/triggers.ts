import { onDocumentCreated } from "firebase-functions/v2/firestore";

import { processDomainEventOutboxEntry } from "./processDomainEvent.js";

export const onDomainEventOutboxCreate = onDocumentCreated(
  "organizations/{organizationId}/domainEventOutbox/{entryId}",
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      return;
    }

    await processDomainEventOutboxEntry(
      event.params.organizationId,
      event.params.entryId,
      snapshot.data(),
    );
  },
);
