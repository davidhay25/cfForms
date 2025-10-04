
///Not currently used...

angular.module("pocApp")

    .service('qHelperSvc', function() {

        //this specifies a specific value or an expression to set the value
        extExtractionValue = "http://hl7.org/fhir/StructureDefinition/sdc-questionnaire-itemExtractionValue"

        return {

            getAllVS : function (Q) {
                //create a list of all the VS in a Q. The format matches the element list
                //so it can be to vsSvc.getAllVS(). It creates 'ED' elements (as much as it can from Q item data)
                let lst = []

                function processItem(item) {
                    let ed = {title:item.text,path:item.linkId}
                    ed.mult = '0..1'
                    //required repeats

                    ed.mult = '0'
                    if (item.required) {
                        ed.mult = '1'
                    }

                    if (item.repeats) {
                        ed.mult += '..*'
                    } else {
                        ed.mult += '..1'
                    }

                    for (const ew of item.enableWhen || []) {
                        ed.enableWhen = ed.enableWhen || []
                        let newEW = {source: ew.question, operator : ew.operator}
                        if (ew.answerCoding) {
                            newEW.value = ew.answerCoding
                            newEW.value.display = ew.answerCoding.display || ew.answerCoding.code
                        }

                        ed.enableWhen.push(newEW)
                    }


                    //set the ed type from the Q type.
                    switch (item.type) {
                        case 'choice' :
                            ed.type = ['CodeableConcept']
                            break
                        case 'date' :
                            ed.type = ['date']
                            break
                        case 'quantity' :
                            ed.type = ['Quantity']
                            break
                        case 'string' :
                            //deliberate fall through
                        case 'text' :
                            ed.type = ['string']
                            break
                    }

                    if (item.answerValueSet) {
                        ed.valueSet = item.answerValueSet
                    }

                    lst.push({ed:ed})

                    if (item.item) {
                        for (const child of item.item) {
                            processItem(child)
                        }
                    }
                }

                processItem(Q)

                return lst

            },

            addFixedValueDEP : function(item,definition,type,value,expression) {
            //add a fixed value extension. Can either be a value or an expression
            //definition is the path in the resource (added to the 'item.definition' value

            //http://hl7.org/fhir/StructureDefinition/sdc-questionnaire-itemExtractionValue
            let ext = {url:extExtractionValue,extension:[]}
            ext.extension.push({url:"definition",valueCanonical:definition})

            if (value) {
                let child = {url:'fixed-value'}
                child[`value${type}`] = value
                ext.extension.push(child)
            } else if (expression){
                let child = {url:'expression'}
                child[`value${type}`] = expression
                ext.extension.push(child)
            } else {
                return  //todo shoul add error...
            }


            item.extension = item.extension || []
            item.extension.push(ext)

        }


        }

    })