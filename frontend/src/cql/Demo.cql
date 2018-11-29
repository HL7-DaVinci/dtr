library Demo version '1.0.0'
using FHIR version '1.0.2'
include FHIRHelpers version '1.0.2' called FHIRHelpers

context Patient

define Age: AgeInYears()
define Eligible: if ("Age" > 40) then 1 else 0
