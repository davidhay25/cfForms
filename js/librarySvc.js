angular.module("pocApp")

    .service('librarySvc', function($q,$http,utilsSvc) {

        return {


            makeQTree : function (Q) {
                //make a simple tree for the display in the Library


            },
            checkIds : function (dg) {
                //ensure all ids are present and unique

                if (! dg.diff) {
                    return
                }

                dg.id = dg.id || utilsSvc.getUUID()

                //replace any duplicated ids. Conditionals will need to be manually fixed.
                let hashId = {}
                let dups = {}

                //pass 1 - find all dups
                for (const ed of dg.diff) {
                    let id = ed.id
                    if (hashId[id]) {
                        //this is a duplicate - get a new uuid for it (don't care if this happens > once
                        dups[id] = true
                    } else {
                        hashId[id] = true
                    }
                }

                //pass 2 - update the ed id. All duplicated ids are replaced
                for (let ed of dg.diff) {
                    let id = ed.id
                    if (dups[id] || ! ed.id) {
                        //this is a duplicate - replace it with a new one
                        ed.id = utilsSvc.getUUID()
                    }
                }


            },


            getAllCheckedOut : function(hashAllDG,user){
                //get all the checked out models - regardless of user
                
                Object.keys(hashAllDG).forEach(function (dg) {
                    
                })
                
            },
            revert : function (model,user) {
                let deferred = $q.defer()
                //abandon local changes and release the checkout

                let kind = 'DG'
                if (model.kind == 'comp') {
                    kind = 'comp'
                }

                let url = `/model/${kind}/${model.name}/revert`

                let config = {headers:{'x-user-email': user.email}}
                $http.put(url,model,config).then(      //the model isn't used by the revert function
                    function (data) {
                        deferred.resolve(data.data)

                    },
                    function (err) {
                        if (err.status == 404) {

                        }
                       deferred.reject(err)
                    }
                )

                return deferred.promise

            },
            checkOut : function (model,user,vo) {
                //check out a model. check server first
                let kind = 'DG'
                if (model.kind == 'comp') {
                    kind = 'comp'
                }


                let url = `/model/${kind}/${model.name}`  //todo check type of model -


                $http.get(url,model).then(
                    function (data) {
                        let libraryModel = data.data

                        //it's possible that the library has the DG or Comp checked out but
                        //the local copy doesn't reflect that (eg imported DG directly)
                        if (! libraryModel.checkedOut || libraryModel.checkedOut == user.email) {
                            libraryModel.checkedOut = user.email
                            performCheckout(libraryModel)

                        } else {
                            alert(`Sorry, this resource is checked out to ${libraryModel.checkedOut}`)
                        }
                    },
                    function (err) {
                        if (err.status == '404') {
                            //This is a new resource and not yet on the library
                            model.checkedOut = user.email
                            performCheckout(model)
                        } else {
                            alert(angular.toJson(err))
                        }

                    }
                )

                function performCheckout(model) {
                    let config = {headers:{'x-user-email': user.email}}
                    $http.put(url,model,config).then(
                        function (data) {
                          //  alert("Resource has been checked out")
                            if (vo) {
                                vo(model)
                            }
                        },
                        function (err) {
                            alert(angular.toJson(err))

                        }
                    )
                }



            },
            checkIn : function (model,user,vo) {
                //check in a model.
                let kind = 'DG'
                if (model.kind == 'comp') {
                    kind = 'comp'
                }

                delete model.checkedOut

                let url = `/model/${kind}/${model.name}`  //todo check type of model -
                let config = {headers:{'x-user-email': user.email}}
                $http.put(url,model,config).then(
                    function (data) {

                        if (vo) {
                            vo()
                        }
                    },
                    function (err) {
                        model.checkedOut = user.email   //if there was an error checking in, then make sure it's still checked out to the current user
                        alert(angular.toJson(err))
                    }
                )
            }
        }
    })