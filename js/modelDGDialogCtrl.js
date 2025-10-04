angular.module("pocApp")
    .controller('modelDGDialogCtrl',
        function ($scope,$uibModal,modelDGDialogSvc,ED,hashAllDG,fullElementList) {

            $scope.fullElementList = fullElementList
            $scope.ed = ED
            let type = ED.type[0]
            $scope.DG = hashAllDG[type]




          //  function

        })