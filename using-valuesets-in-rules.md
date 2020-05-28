# Using ValueSets in DTR Rules

ValueSets can be used by the CQL prepopulation logic. These ValueSets can come from the ruleset's local resources or from VSAC.

## Referencing ValueSets

When ValueSets are used, they should be referenced by their canonical URL in most cases.

### VSAC ValueSets

VSAC ValueSets should be referenced by the canonical URL for VSAC, `http://cts.nlm.nih.gov/fhir/ValueSet/{OID}`. For example, the VSAC ValueSet with OID `2.16.840.1.113762.1.4.1219.3` has the the canonical URL `http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1219.3`. This should be used in all places when referencing the ValueSet. CRD will load expansions automatically for these ValueSets when referenced assuming it has VSAC credentials available.

### Locally Defined ValueSets

Local ValueSets created specifically for a DTR rule can be stored in the `Shared` or topic's respective `resources` folder. It can be referenced by it's own id in CQL logic. But in the Library or Questionnaire resources it must use a faux canonical URL, `<server-path>ValueSet/{id}`. For example, a local ValueSet with id `copd` should be referenced by `copd` in the CQL valueset definition. In the FHIR Library or Questionnaire, it should be referened by the faux canonical URL. `<server-path>ValueSet/copd`. The CRD server will replace the `<server-path>` chunk with the URL of the FHIR endpoint on the CRD server.

### HL7 FHIR ValueSets or ValueSets From Other Sources

CRD has no way to pull down ValueSets and create expansions for ValueSets from other sources. It is most likely that the HL7 FHIR ValueSets will be desirable to use in DTR rules. These ValueSets do not have an expansion available in their documentation/definition. If you grab their JSON definition, they will NOT work! To get an expansion of these, you will need to make use of a terminology server to get and store the valueset with the expansion in the `Shared/R4/resources` folder. These ValueSets can be used in CQL Libraries and Questionnaires using their original canonical URL.

As of May 28th 2020, http://tx.fhir.org/r4/tx is able to give expansions for these valuesets. It is a bit tricky to get them as the ValueSets are not listed in the dropdown of ValueSets on the server. A specific URL with the ValueSet with the id is needed. For example, to get the expansion for the ValueSet with canonical URL `http://hl7.org/fhir/ValueSet/medicationrequest-intent` navigate to `http://tx.fhir.org/r4/tx?op=expand&valueset=medicationrequest-intent&filter=`. The JSON ValueSet with expansion will be in a text box with a green background. This content can be stored in the `Shared/R4/resources` folder and be used by CQL Libraries and Questionnaires.

## Using a ValueSet in CQL

To use a ValueSet in CQL you have to reference it in two places. The CQL logic, and the FHIR Library resource. 

### CQL Logic

The `valueset` statements should be placed at the top of the CQL file after the `library`, `using`, and `include` statements and before any `define` statements. For example, defining the use of VSAC ValueSet "Bronchiectasis" with oid "2.16.840.1.113762.1.4.1219.3" and "COPD" with id "copd" from local ruleset resources:

```
valueset "COPD": 'copd'
valueset "Bronchiectasis": 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1219.3'
```

In this example `"Bronchiectasis"` and `"COPD"` are what will be used to reference the ValueSets in this CQL library file. `'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1219.3'` and `'cpod'` are the external identifiers for the ValueSets.

ValueSets can be used in CQL in a few different ways. But they are most commonly used to filter a retrieval of data. For example, this statement returns all Bronchiectasis Conditons:

```
define "Bronchiectasis Conditions":
  [Condition: "Bronchiectasis"]
```

### FHIR Library

For ValueSets to be properly used by CQL in the context of FHIR, the corresponding FHIR Library resource must have a [dataRequirement](http://hl7.org/fhir/library-definitions.html#Library.dataRequirement) element for each ValueSet used. For the above CQL example, the Library must reference the ValueSets like so:

```json
{
  "resourceType": "Library",
  ...
  "dataRequirement": [
    {
      "type": "Condition",
      "codeFilter": [
        {
          "path": "code",
          "valueSet": "<server-path>ValueSet/copd"
        }
      ]
    },
    {
      "type": "Condition",
      "codeFilter": [
        {
          "path": "code",
          "valueSet": "http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1219.3"
        }
      ]
    }
  ],
  ...
}
```

NOTE: CRD will replace `<server-path>` with the base path of the CRD FHIR endpoint. This is used for ValueSets that are provided locally with the rule set. VSAC ValueSets should use the canonical URL.

The resource type which each ValueSet will be used to filter on in the CQL is referenced here. This could be used to indicate to the SMART applications or the FHIR server the scope of which resources are required for execution.

## Using a ValueSet in a Questionnaire

To use a valueset in a Questionnaire item as the options for a `choice` or `open-choice` item, simply reference the canonical url to the ValueSet. For example, to use the HL7 FHIR Administrative Gender ValueSet in a `choice` item:

```json
{
  "linkId": "1.5",
  "text": "Gender",
  "type": "choice",
  "required": true,
  "answerValueSet": "http://hl7.org/fhir/ValueSet/administrative-gender",
  "extension": [
    {
      "url": "http://hl7.org/fhir/StructureDefinition/cqf-expression",
      "valueExpression": {
        "language": "text/cql",
        "expression": "\"BasicPatientInfoPrepopulation\".Gender"
      }
    }
  ]
}
```

NOTE: Because this is not a VSAC ValueSet, this ValueSet must have an expansion manually pulled down and stored in the `Shared/R4/resources` folder as discussed above.

CRD will embed the referenced ValueSets in the `contained` field of the Questionnaire and modify the references appropiately when it is requested from the CRD FHIR endpoint.