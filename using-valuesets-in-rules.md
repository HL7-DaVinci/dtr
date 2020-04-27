# Using ValueSets in DTR Rules

ValueSets can be used by the CQL prepopulation logic. These ValueSets can come from the ruleset's local resources or from VSAC.

## Using a ValueSet in CQL

To use a ValueSet in CQL you have to reference it in two places. The CQL logic, and the FHIR Library resource. VSAC ValueSets should be referenced by the canonical URL for VSAC, `http://cts.nlm.nih.gov/fhir/ValueSet/{OID}`.

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

The resource type that each ValueSet will be used to filter on is referenced here. This should be used to indicate to the SMART applications or the FHIR server the scope of which resources are required for execution.

