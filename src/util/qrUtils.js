export const DTR_INFORMATION_ORIGIN =
  'http://hl7.org/fhir/us/davinci-dtr/StructureDefinition/information-origin';

const originAutoExtension = [
  {
    url: DTR_INFORMATION_ORIGIN,
    extension: [
      {
        url: 'source',
        valueCode: 'auto',
      },
    ],
  },
];

const originOverrideExtension = [
  {
    url: DTR_INFORMATION_ORIGIN,
    extension: [
      {
        url: 'source',
        valueCode: 'override',
      },
    ],
  },
];

const originManualExtension = [
  {
    url: DTR_INFORMATION_ORIGIN,
    extension: [
      {
        url: 'source',
        valueCode: 'manual',
      },
    ],
  },
];

/**
 * Compares the original QuestionnaireResponse with the new one and adds the information origin extension as appropriate.
 * DTR extension: https://hl7.org/fhir/us/davinci-dtr/StructureDefinition-information-origin.html
 * @param {QuestionnaireResponse} originalQr - the original QuestionnaireResponse to compare newQR against - may be null
 * @param {QuestionnaireResponse} newQr - the new QuestionnaireResponse that is (likely) being saved
 * @returns {QuestionnaireResponse} with the information origin extensions added
 */
export function processInformationOrigin(originalQr, newQr) {

  // Check if the new QR is null or has no items
  if (!newQr || !newQr.item || newQr.item.length === 0) {
    return newQr;
  }

  /**
   * Recursively processes items in the QuestionnaireResponse
   * @param {Array} newItems - items from the new QuestionnaireResponse
   * @param {Array} originalItems - items from the original QuestionnaireResponse (may be null/undefined)
   */
  function processItems(newItems, originalItems) {
    if (!newItems || !Array.isArray(newItems)) {
      return;
    }

    newItems.forEach((newItem) => {
      // Find corresponding item in original QR by linkId
      const originalItem = originalItems?.find(
        (item) => item.linkId === newItem.linkId
      );

      // Process answers for this item
      if (newItem.answer && Array.isArray(newItem.answer)) {
        newItem.answer.forEach((newAnswer) => {
          // Check if there's a corresponding answer in the original item
          const originalAnswer = originalItem?.answer?.find((answer) =>
            answersAreEqual(newAnswer, answer)
          );

          if (originalAnswer) {
            // Check if original answer had "auto" extension and value is different
            const hasAutoExtension = hasInformationOriginExtension(
              originalAnswer,
              'auto'
            );
            const valueChanged = !answersHaveSameValue(
              newAnswer,
              originalAnswer
            );

            if (hasAutoExtension && valueChanged) {
              // Value was auto-populated but changed - mark as override
              newAnswer.extension = originOverrideExtension;
            } else if (hasAutoExtension && !valueChanged) {
              // Value was auto-populated and unchanged - keep auto extension
              newAnswer.extension = originAutoExtension;
            }
            // If original didn't have auto extension, leave new answer as is
          } else {
            // New answer doesn't exist in original - mark as manual
            newAnswer.extension = originManualExtension;
          }
        });
      }

      // Recursively process nested items
      if (newItem.item && Array.isArray(newItem.item)) {
        processItems(newItem.item, originalItem?.item);
      }
    });
  }

  /**
   * Checks if an answer has the information origin extension with a specific value
   * @param {Object} answer - the answer object to check
   * @param {String} sourceValue - the source value to look for ('auto', 'manual', 'override')
   * @returns {Boolean} true if the answer has the extension with the specified source value
   */
  function hasInformationOriginExtension(answer, sourceValue) {
    if (!answer.extension || !Array.isArray(answer.extension)) {
      return false;
    }

    return answer.extension.some((ext) => {
      if (ext.url !== DTR_INFORMATION_ORIGIN) {
        return false;
      }

      return ext.extension?.some(
        (subExt) => subExt.url === 'source' && subExt.valueCode === sourceValue
      );
    });
  }

  /**
   * Compares two answers to see if they represent the same answer choice
   * @param {Object} answer1 - first answer to compare
   * @param {Object} answer2 - second answer to compare
   * @returns {Boolean} true if the answers are for the same question choice
   */
  function answersAreEqual(answer1, answer2) {
    // Only consider value fields (valueString, valueCoding, etc.) for comparison
    const getValueKeys = (answer) => {
      return Object.keys(answer).filter((key) => key.startsWith('value'));
    };

    const keys1 = getValueKeys(answer1);
    const keys2 = getValueKeys(answer2);

    if (keys1.length !== keys2.length) {
      return false;
    }

    // Check if they have the same value keys (valueString, valueCoding, etc.)
    return keys1.every((key) => keys2.includes(key));
  }

  /**
   * Compares the actual values of two answers
   * @param {Object} answer1 - first answer to compare
   * @param {Object} answer2 - second answer to compare
   * @returns {Boolean} true if the answer values are the same
   */
  function answersHaveSameValue(answer1, answer2) {
    // Get value fields from both answers
    const getValueFields = (answer) => {
      const valueFields = {};
      Object.keys(answer).forEach((key) => {
        if (key.startsWith('value')) {
          valueFields[key] = answer[key];
        }
      });
      return valueFields;
    };

    const answer1Values = getValueFields(answer1);
    const answer2Values = getValueFields(answer2);

    // If they don't have the same value keys, they're different
    const keys1 = Object.keys(answer1Values);
    const keys2 = Object.keys(answer2Values);
    
    if (keys1.length !== keys2.length || !keys1.every(key => keys2.includes(key))) {
      return false;
    }

    // Compare each value field based on its type
    for (const valueKey of keys1) {
      const value1 = answer1Values[valueKey];
      const value2 = answer2Values[valueKey];

      let valuesEqual = false;

      switch (valueKey) {
        case 'valueString':
        case 'valueDate':
        case 'valueDateTime':
        case 'valueTime':
        case 'valueInstant':
        case 'valueUri':
        case 'valueUrl':
        case 'valueCanonical':
        case 'valueOid':
        case 'valueUuid':
        case 'valueId':
        case 'valueMarkdown':
        case 'valueBase64Binary':
          // Simple string comparison for primitive types
          valuesEqual = value1 === value2;
          break;

        case 'valueBoolean':
        case 'valueInteger':
        case 'valueDecimal':
        case 'valuePositiveInt':
        case 'valueUnsignedInt':
          // Direct comparison for primitive types
          valuesEqual = value1 === value2;
          break;

        case 'valueCoding':
          // Compare coding objects by system, code, and display
          valuesEqual = compareCodings(value1, value2);
          break;

        case 'valueCodeableConcept':
          // Compare CodeableConcept by comparing all codings
          valuesEqual = compareCodeableConcepts(value1, value2);
          break;

        case 'valueQuantity':
          // Compare Quantity by value, unit, system, and code
          valuesEqual = compareQuantities(value1, value2);
          break;

        case 'valueReference':
          // Compare Reference by reference string
          valuesEqual = compareReferences(value1, value2);
          break;

        case 'valueAttachment':
          // Compare Attachment by contentType, data, url, etc.
          valuesEqual = compareAttachments(value1, value2);
          break;

        default:
          // For unknown types, fall back to JSON comparison
          console.warn(`Unknown value type ${valueKey}, using JSON comparison`);
          valuesEqual = JSON.stringify(value1) === JSON.stringify(value2);
          break;
      }

      if (!valuesEqual) {
        // console.log(`Value difference found for ${valueKey}:`, JSON.stringify(value1), 'vs', JSON.stringify(value2));
        return false;
      }
    }

    return true;
  }

  /**
   * Compares two Coding objects
   */
  function compareCodings(coding1, coding2) {
    if (!coding1 && !coding2) return true;
    if (!coding1 || !coding2) return false;
    
    return coding1.system === coding2.system &&
           coding1.code === coding2.code &&
           coding1.display === coding2.display;
  }

  /**
   * Compares two CodeableConcept objects
   */
  function compareCodeableConcepts(concept1, concept2) {
    if (!concept1 && !concept2) return true;
    if (!concept1 || !concept2) return false;

    // Compare text field
    if (concept1.text !== concept2.text) return false;

    // Compare coding arrays
    const codings1 = concept1.coding || [];
    const codings2 = concept2.coding || [];
    
    if (codings1.length !== codings2.length) return false;
    
    return codings1.every((coding1, index) => 
      compareCodings(coding1, codings2[index])
    );
  }

  /**
   * Compares two Quantity objects
   */
  function compareQuantities(quantity1, quantity2) {
    if (!quantity1 && !quantity2) return true;
    if (!quantity1 || !quantity2) return false;
    
    return quantity1.value === quantity2.value &&
           quantity1.unit === quantity2.unit &&
           quantity1.system === quantity2.system &&
           quantity1.code === quantity2.code;
  }

  /**
   * Compares two Reference objects
   */
  function compareReferences(ref1, ref2) {
    if (!ref1 && !ref2) return true;
    if (!ref1 || !ref2) return false;
    
    return ref1.reference === ref2.reference &&
           ref1.type === ref2.type &&
           ref1.display === ref2.display;
  }

  /**
   * Compares two Attachment objects
   */
  function compareAttachments(att1, att2) {
    if (!att1 && !att2) return true;
    if (!att1 || !att2) return false;
    
    return att1.contentType === att2.contentType &&
           att1.data === att2.data &&
           att1.url === att2.url &&
           att1.size === att2.size &&
           att1.hash === att2.hash &&
           att1.title === att2.title;
  }

  // Process all items recursively
  processItems(newQr.item, originalQr?.item);

  return newQr;
}
