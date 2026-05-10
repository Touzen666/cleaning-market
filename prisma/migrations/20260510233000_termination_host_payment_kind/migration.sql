-- Ujednolicenie: koszty po stronie ZW mają ten sam typ zwrot/przychód co należności właściciela
UPDATE "ReportTerminationCost"
SET "ownerPaymentKind" = 'REVENUE'::"TerminationOwnerPaymentKind"
WHERE "side" = 'HOST_COMPANY' AND "ownerPaymentKind" IS NULL;
