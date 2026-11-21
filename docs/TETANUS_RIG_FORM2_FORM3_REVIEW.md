# ATS, TT and ERIG in Doctor Form 2 and Nurse Form 3

Reviewed 30 September 2026. These are clinical decision aids and workflow checks, not an automatically chosen treatment regimen. The doctor remains responsible for the indication, product, dose and precautions.

## Clinical basis

| Product | Assessment and administration rules reflected in the forms |
| --- | --- |
| TT (tetanus toxoid) | Animal bites with saliva are tetanus-prone wounds. Check the primary series and last tetanus dose. A complete series with a dose less than five years ago generally needs no wound booster; a complete series with a dose at least five years ago generally needs one. Unknown or incomplete history needs active vaccination and passive-protection assessment. Record the actual IM injection separately from the doctor's order. Age-appropriate vaccine choice and catch-up series remain clinician decisions. |
| ATS (equine anti-tetanus serum) | Passive tetanus antitoxin is distinct from TT and from rabies immunoglobulin. In a tetanus-prone wound with unknown or incomplete immunity, assess passive protection as well as vaccination. Human TIG is preferred in current guidance where available; equine ATS carries hypersensitivity, anaphylaxis and serum-sickness risks. If a clinician orders ATS under local protocol, Form 2 requires product-specific dose and precaution instructions; Form 3 records actual IU, mL, IM site and batch. No universal ATS dose or skin-test rule is hard-coded. |
| ERIG (equine rabies immunoglobulin) | Assess for Category III exposure in a patient without previous rabies immunization; immunocompromised Category II/III cases need individual assessment and full PEP. Maximum **40 IU/kg** of verified body weight, once, ideally with initial rabies vaccine and no later than **day 7 after the first vaccine dose**. Infiltrate into and around wounds, separate from rabies vaccine. Do not delay rabies vaccine when ERIG is unavailable. The limit is in IU; convert to mL using the selected product's actual concentration. |

Sources: [CDC tetanus wound management](https://www.cdc.gov/tetanus/hcp/clinical-guidance/index.html), [MSF equine tetanus antitoxin guidance](https://medicalguidelines.msf.org/en/viewport/EssDr/english/tetanus-antitoxin-equine-16687823.html), [WHO rabies guidance](https://www.who.int/teams/immunization-vaccines-and-biologicals/policies/position-papers/rabies), and [Philippine DOH/RITM rabies guideline references](https://www.foi.gov.ph/agencies/doh/rabies-vaccination-guidelines/) (2019 Rabies Manual of Procedures). Local policy and the actual product insert must be checked before injection. Historical TIG/HRIG records remain readable, but this request exposes only ATS, TT and ERIG as new orders.

## Implemented workflow and inventory

- Form 2 has separate **TT**, **ATS** and **ERIG** decisions, including pending and not ordered states. It captures tetanus history, last dose, ERIG weight and indication, and doctor's instructions. No product is automatically prescribed from bite category or stock availability.
- Form 2 shows the clinic's active, unexpired vial count for each of the three products when inventory loads. A failed lookup is shown as unavailable rather than zero stock. An out-of-stock order remains possible for clinical documentation and supply/referral planning.
- Form 3 shows the corresponding doctor's order and any prior administration. The nurse explicitly selects a current clinic inventory batch and enters the vials used, date, IU where applicable, mL, route and site. It cannot record a product without a matching order or an active, unexpired batch with adequate quantity.
- Saving an administration writes a separate treatment record and uses the existing inventory deduction service, including its earliest-expiry batch check, inventory transaction and audit log. The selected batch, vial count and expiry are saved on the treatment record. The vaccination transaction rolls back if a clinical or stock check fails. These are not rabies vaccine schedule doses.
- The existing inventory stores **vial counts**, not drug concentration or IU remaining. The nurse must verify package strength and choose the actual number of vials used. Shared-vial or IU-level stock accounting is not automated.
- The local `animalbitecenter` inventory, checked read-only on 30 September 2026, had `mimi`, `Speeda`, `Verorab` and `vevem`, with **no identifiable ATS, TT or ERIG batches**. No new stock was created. Form 3 therefore blocks local administration of these products until the clinic records real batches. Product classification requires an explicit acronym or generic name in the inventory `vaccine_type`; a brand-only entry cannot safely be inferred from its broad preset category.

## Form 3 findings and limits

- A nurse can save only the prescribed adjunct administration in an approved vaccine episode without falsely marking a prefilled rabies dose as given. The first rabies dose may be a verified external record for ERIG timing. The server rejects ERIG after day 7, above the 40 IU/kg maximum, without a first vaccine dose, or after another RIG in the same episode. Historical TT/Td and ATS/TIG markers also prevent repeat documentation in their respective groups.
- Existing no-vaccine and continue-existing-schedule plans still bypass the nurse treatment path. They do not provide an independent tetanus-only episode workflow.
- Once treatment begins, the original consultation is locked. The existing addendum is a narrative note, not a structured medication-order amendment. Old episodes without structured orders need a clinician-managed prescription workflow before this administration control can be used.
- Catch-up vaccination appointments, ATS allergy precautions and observation, ERIG product concentration, and special cases are not automated. The administering clinician must verify the product insert and local protocol. The UI does not treat an empty stock list as permission to record an outside injection from clinic inventory.

## Verification and installation

- Migration `2026_09_30_000001_add_prophylaxis_orders_to_treatment_records.php` adds nullable structured orders and administered IU. It was applied to the local `animalbitecenter` database; other environments need the migration before these forms are used.
- Relevant backend suite: 68 tests, 351 assertions passed, including order matching, timing, maximum dose, real deductions, expiry, insufficient stock, clinic isolation, inventory FIFO and transaction rollback.
- Two Playwright component tests passed for desktop and 390px width. Vite production bundling passed. These do not replace a full signed-in clinic workflow test.
- Full frontend typechecking remains blocked by pre-existing undefined `setCheckInSuccess` references in `frontend/src/features/patients/components/PatientDetailsModal.tsx` at lines 705 and 708.
