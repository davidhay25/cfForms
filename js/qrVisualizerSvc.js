angular.module("pocApp")

    .service('qrVisualizerSvc', function() {

        let config = {}
        let cmConfig = {}


        return {

            makeReport1 : function (Q,QR) {
                //generate a report based on the QR rather than the Q
                let hashQ = {}  //generate a hash of item by linkId

                //build the has of Q items by linkId
                function processQItem(item) {
                    hashQ[item.linkId] = item
                    if (item.item) {
                        for (const child of item.item) {
                            processQItem(child)
                        }
                    }
                }

                for (const item of Q.item || []) {
                    processQItem(item)
                }


                //now generate the report from the QR

                let arReport = []

                function processQRItem(qrItem,level) {


                    for (let ans of qrItem.answer || []) {

                        let lne = {item:qrItem,answerDisplay:[],level:level}
                        let linkId = qrItem.linkId

                        //ans will have a single property - valueCoding, valueString etc
                        let keys = Object.keys(ans)
                        for (const key of keys ) {
                            let value = ans[key]
                            lne.dt = key.replace("value","")

                            //should only be 1
                            switch (key) {
                                case "valueCoding":
                                    lne.answerDisplay.push(`${value.code} | ${value.display} | ${value.system}`)

                                    lne.answerCoding = value
                                   // codedItems.push(lne)

                                    break
                                case "valueQuantity":
                                    lne.answerDisplay.push(`${value.value} ${value.code}`)
                                    break
                                /*     case "valueString" :
                                         thing.dt = 'String'
                                         thing.answerDisplay.push(value)
                                         break
                                     */
                                default :
                                    //todo - replace wirh code
                                    //if (lne.item.linkId !== 'id-2') {
                                    if (qrItem.text  !== 'text') {
                                        lne.answerDisplay.push(value)
                                    } else {
                                        lne.answerDisplay.push("Text removed to improve report display")
                                    }

                            }
                            arReport.push(lne)
                        }





                    }

                    if (qrItem.item) {
                        level++
                        for (let child of qrItem.item) {
                            processQRItem(child,level)
                        }
                    }


                }


                //now parse the QR building the report
                for (const item of QR.item) {
                    processQRItem(item,1)
                }

                return arReport

            },
            makeReport: function (Q,QR) {
                //create a hash of values from the QR
                //parse over the Q to generate the report
                //missing items can be flagged
                let hashQR = {}
                let arReport = []
                let codedItems = []
                let textReport = ""  //the textual version of the report. todo Currently hard coding the linkID

                function processQRItem(hash,item) {

                    //looking for the textual report
                    if (item.text == 'text'  ) {
                        if (item.answer) {
                            let report = item.answer[0].valueString
                            report = report.replace(/\n/g, '<br>')
                            textReport = report
                        }
                    }

                    hash[item.linkId] = item
                    if (item.item) {
                        for (const child of item.item) {
                            processQRItem(hash,child)
                        }
                    }
                }

                //the result of this will be to populate hashQR with ann answers, keyed by linkId
                for (const item of QR.item) {
                    processQRItem(hashQR,item)
                }


                function processQItem(lst,item,level) {
                    let lne = {item:item,answerDisplay:[],level:level}
                    let linkId = item.linkId
                    let qrItem = hashQR[linkId]     //the item from the QR that has any answers
                    if (qrItem && qrItem.answer) {
                        // there is an answer in the qr
                        lne.answer = qrItem.answer


                        for (let ans of qrItem.answer) {
                            //ans will have a single property - valueCoding, valueString etc
                            let keys = Object.keys(ans)
                            for (const key of keys ) {
                                let value = ans[key]
                                lne.dt = key.replace("value","")

                                //should only be 1
                                switch (key) {
                                    case "valueCoding":
                                        lne.answerDisplay.push(`${value.code} | ${value.display} | ${value.system}`)

                                        lne.answerCoding = value
                                        codedItems.push(lne)

                                        break
                                    case "valueQuantity":
                                        lne.answerDisplay.push(`${value.value} ${value.code}`)
                                        break
                                    /*     case "valueString" :
                                             thing.dt = 'String'
                                             thing.answerDisplay.push(value)
                                             break
                                         */
                                    default :
                                        //todo - replace wirh code
                                        //if (lne.item.linkId !== 'id-2') {
                                        if (qrItem.text  !== 'text') {
                                            lne.answerDisplay.push(value)
                                        } else {
                                            lne.answerDisplay.push("Text removed to improve report display")
                                        }

                                }
                            }

                            arReport.push(lne)



                        }

                    } else {
                        //no answer in the QR - just push th eline into the report
                        if (item.item) {
                            lne.dt = 'Group'    //todo not sure if this is right
                        } else {
                            lne.missingAnswer = true
                        }

                        //and add to the coded items list if there's a ValueSet or coded answerOption
                        if (item.answerValueSet || (item.answerOption && item.answerOption[0].valueCoding)) {
                            lne.missingAnswer = true
                            codedItems.push(lne)
                        }

                        arReport.push(lne)
                    }

                    if (item.item) {
                        level++
                        for (const child of item.item) {
                            processQItem(lst,child,level)
                        }
                    }
                }

                //now iterate over the Q. Get the answer from the hashQR
                for (const item of Q.item) {
                    processQItem(arReport,item,1)
                }



                return {report:arReport,codedItems:codedItems,textReport:textReport}

            }
        }
    })