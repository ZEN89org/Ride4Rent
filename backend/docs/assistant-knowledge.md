# Keeping the app assistant current

The assistant does not learn repository edits, deployments or user conversations automatically.

`app/Services/AssistantKnowledge.php` holds approved English/Filipino explanations of app workflows. Recognized policy questions are answered directly from these explanations, even if the model is unavailable. The same explanations are included in the model prompt for other questions. Update them whenever a workflow changes, and update the knowledge version.

Reservation percentage and no-show timing come from `RentalPolicy.php`, shared with booking calculation, vehicle serialization and automatic no-show handling. Advance-booking limits are read from the current platform settings. Vehicle prices use `DemandPricingService`, and recommendations are restricted to eligible current listings. Do not add guessed stock, hard-coded brand lists, universal age/ID requirements or unsupported payment gateways.

When changing a feature:

1. Update the actual workflow and its matching knowledge topic together.
2. Add or adjust assistant regression questions in `RentalIntegrityTest`.
3. Run the backend tests. Model requests in assistant tests must be faked.
4. Deploy the backend containing both the behavior and knowledge changes. Metro changes alone do not update Railway.
5. Ask the deployed assistant about reservation fees, approved-license replacement, extensions and no-shows. Its API response includes `knowledge_version` for deployment checks.

The assistant can explain workflows and show public vehicle recommendations. It does not inspect private license photos, confirm transfers, modify bookings, issue refunds or verify that notifications were delivered. Screen-specific rules such as smoking, pets and age requirements must come from the selected vehicle/operator rather than a universal invented policy.
