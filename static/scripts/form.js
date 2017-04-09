function validateForm(){
    for (var i = 0; i < 2; i++){
        var totalWeight = 0.0;
        for (var s = 0; s < strategies[i].length; s++){
            $(strategies[i][s]).find(".weight").each(function() {
                totalWeight += parseFloat(this.value)/100.0;
            });
        }

        if (totalWeight != 1.0){
            for (var s = 0; s < strategies[i].length; s++){
                $(strategies[i][s]).find(".weight").each(function() {
                    $(this).effect("highlight", { color: "red" }, 1000);
                });
            }

            return false;
        }
    }
    return true;
}

function getJsonRequest(createDiv) {
    var data = {}

    createDiv.find(".input_main").each(function () {
        data[this.name] = this.value
    });

    // Hardcoded for now...
    data["min_year"] = 1926;
    data["max_year"] = 2010;

    data['strategies'] = [];
    createDiv.nextUntil(".CreateSimulation").each(function () {
        if ($(this).is(":visible") && $(this).attr('class') == "Strategy") { //There is certainly a jquery'er way to do this.
            var strat = {};
            var assets = [];
            $(this).find(".input_strat").each(function() {
                strat['args'] = {};
                if (this.name.includes("percent")){
                    strat['args'][this.name] = parseFloat(this.value)/100.0;
                } else {
                    strat['args'][this.name] = this.value;
                }

                strat["type"] = $(this).data("type");
            });

            $(this).find(".weight").each(function() {
                strat["weight"] = parseFloat(this.value)/100.0;
            });

            $(this).find(".stocks").each(function() {
                assets.push(parseFloat(this.value)/100.0);
            });

            $(this).find(".bonds").each(function() {
                assets.push(parseFloat(this.value)/100.0);
            });

            strat["asset_allocation"] = assets;
            strat["type"] = $(this).data("type");
            data['strategies'].push(strat)
        }
    });

    console.log(JSON.stringify(data));
    return data;
}

function hideInputs(){
    $(".CreateSimulation").hide(200);
    $(".Strategy:visible").hide(200);
    $(".runSimButt").hide();
    $(".compareButt").hide();
}

function showInputs(){
    $(".CreateSimulation").show(200);
    $(".Strategy:not(#stratClone)").show(200);
    if (runSimulationAvailable()) {
        $(".runSimButt").show();
    }
    $(".compareButt").show();
}

$(document).ready(function () {
    $('.runSimButt').click(function () {
        if (!validateForm()){
            $(this).effect("highlight", { color: "red" }, 1000);
            return;
        }
        $("#simgraph").remove();
        $(".showParamsButt").remove();
        $(".reAnimateButt").remove();

        $(".runSimButt").hide(350); // This is so you don't notice how long the web calls take :)
        $(".compareButt").hide(350);

        var body = $("#actualBody");

        var data = {};


        requests = [];
        $(document).find(".CreateSimulation").each(function (){
            requests.push(getJsonRequest($(this)));
        });

        $("<label type=\"submit\" class=\"showParamsButt\">+</label>").appendTo(body).click(function() {
            if ($(".showParamsButt").text() == "+"){
                $(".showParamsButt").text("-");
                showInputs();
            } else {
                $(".showParamsButt").text("+");
                hideInputs();
            }
        });

        $("<label type=\"submit\" class=\"reAnimateButt\">Restart Animation</label>").hide().appendTo(body).click(function() {
            sim.animate();
        });

        $("<p id=\"simgraph\"></p>").appendTo(body);


        function success(result1, result2) {
            // Clearly there is something I am missing.
            // On single ajax call we get the data in result1
            // On double ajax call we get the data at result1[0] and result2[0]
            // Not sure why, but its working for now...so TODO figure this out.
            console.log(JSON.stringify(result1));
            sim.init(
                Number(requests[0].retirement_length),
                Number(requests[0].initial_portfolio_value),
                Number(requests[0].min_year),
                Number(requests[0].max_year));
            if (requests.length == 2) {
                sim.showSimulation(result1[0], result2[0]);
            } else {
                sim.showSimulation(result1);
            }
            $(".reAnimateButt").show();
        }
        function failure(response) {
            alert("Failed to call web server." + JSON.stringify(response)); // TODO clean up error conditions
        }

        // There has to be a better way to write this...
        if (requests.length == 1){
            $.when(
                $.ajax({
                    type: 'POST',
                    url: '/simulations',
                    data: JSON.stringify(requests[0]),
                    contentType: "application/json",
                    dataType: 'json'
                }))
            .then(success, failure);
        } else {
            $.when(
                $.ajax({
                    type: 'POST',
                    url: '/simulations',
                    data: JSON.stringify(requests[0]),
                    contentType: "application/json",
                    dataType: 'json'
                }),
                $.ajax({
                    type: 'POST',
                    url: '/simulations',
                    data: JSON.stringify(requests[1]),
                    contentType: "application/json",
                    dataType: 'json'
                }))
            .then(success, failure);
        }

        hideInputs();
    });
});

function displayResults(results){
    var body = $("#actualBody");
    $('#Results').html(results.success_rate.toString()).appendTo(body).show();
}

var comparing = false;
$(document).ready(function () {
    $('.compareButt').click(function () {
        if (!comparing){
            comparing = true;
            $(".runSimButt").hide();

            var newCreateDiv = $("#createClone").clone().removeAttr('id').insertAfter(".compareButt").show('slow');
            newCreateDiv.find('.caSelect').click(function () {
                addStrategy("ConstAmount", "const_amount", $(".CreateSimulation").last(), 1);
            });
            newCreateDiv.find(".cpSelect").click(function () {
                addStrategy("ConstPercent", "const_percent", $(".CreateSimulation").last(), 1);
            });
            newCreateDiv.find('.gkSelect').click(function () {
                addStrategy("GuytonKlinger", "guyton_klinger", $(".CreateSimulation").last(), 1);
            });
            newCreateDiv.find('input[name=initial_portfolio_value]').change(function () {
                portfolioChange($(this), 1);
            });
            newCreateDiv.find('input[name=initial_portfolio_value]').focus(function () {
                $(this).data('oldVal', parseFloat($(this).val()));
            });

            $(this).text("Remove Second Strategy");
        } else {
            $(".runSimButt").show();
            comparing = false;
            var lastCreate = $(".CreateSimulation").last();
            $(lastCreate).nextUntil(".CreateSimulation").each(function () {
                if ($(this).is(":visible") && $(this).attr('class') == "Strategy") {
                    $(this).remove();
                }
            });

            strategies[1] = [];

            $(lastCreate).remove();
            $(this).text("Compare With Another Strategy");
        }
    });
});

function runSimulationAvailable(){
    var available = false;
    $('.CreateSimulation').each(function () {
        available = false;
        $(this).nextUntil(".CreateSimulation").each(function () {
            if ($(this).is(":visible") && $(this).attr('class') == "Strategy") {
                available = true;
            }
        });

        if (!available){
            return false;
        }
    });

    return available;
}

var strategies = [[],[]]
var stratId = 0;
function addStrategy(c, t, create, strategyIndex){
    var ratio;
    $(create).find('input[name=initial_portfolio_value]').each(function() {
        ratio = $(this).val() / 1000000.0;
    });

    if (strategies[strategyIndex].length == 0){
       var newStratDiv = $("#stratClone").clone()
                                  .removeAttr('id')
                                  .insertAfter($(create))
                                  .show();
    } else {
        var newStratDiv = $("#stratClone").clone()
                                          .removeAttr('id')
                                          .insertAfter($(strategies[strategyIndex][strategies[strategyIndex].length -1]))
                                          .show();
    }

    stratId++;
    newStratDiv.data("stratId", stratId);
    strategies[strategyIndex].push(newStratDiv);
    $(newStratDiv).data("type", t);
    $(newStratDiv).data("strategyIndex", strategyIndex);
    var newStrat = $("." + c).last().clone();
    if (c == "GuytonKlinger"){
        $("<legend>Guyton Klinger</legend>").appendTo(newStratDiv.find('.stratFieldset'));
        $(newStrat).find('input[name=initial_amount]').each(function() {
            var defaultVal = $(this).val();
            $(this).val(defaultVal * ratio);
        });
    }

    if (c == "ConstAmount"){
        $("<legend>Constant Amount</legend>").appendTo(newStratDiv.find('.stratFieldset'));
        $(newStrat).find('input[name=amount]').each(function() {
            var defaultVal = $(this).val();
            $(this).val(defaultVal * ratio);
        });
    }

    if (c == "ConstPercent") {
        $("<legend>Constant Percent</legend>").appendTo(newStratDiv.find('.stratFieldset'));
    }

    $(newStrat).appendTo(newStratDiv.find('.stratFieldset')).show();

    var id = stratId;
    $(newStratDiv).find(".removeStrategyButt").click(function(){
        for (var i = 0; i < strategies[strategyIndex].length; i++){
            if (strategies[strategyIndex][i].data("stratId") == id){
                strategies[strategyIndex].splice(i, 1);
            }
        }

        $(this).parent().parent().parent().remove()
        balanceWeights();

        if (!runSimulationAvailable()){
            $(".runSimButt").hide('slow');
        }
    });

    if (runSimulationAvailable()){
        $(".runSimButt").show();
    }
    $(".compareButt").show();

    $(newStratDiv).find(".weight").each(function (){
        $(this).data('oldVal', parseFloat($(this).val()));
    });

    $(newStratDiv).find(".weight").change(function (){
        $(this).data('manualChange', true);
        balanceWeights();
    });

    $(newStratDiv).find(".stocks").change(function (){
        var newVal = parseFloat($(this).val());
        $(this).val(newVal.toFixed(0) + " %");

        var bondVal = 100 - newVal;
        $(this).parent()
        .find(".bonds")
        .val(bondVal.toFixed(0) + " %")
        .effect("highlight", { color: '#84b1f9'}, 3000); // Thats like a lightish blueish color.
    });

    $(newStratDiv).find(".bonds").change(function (){
        var newVal = parseFloat($(this).val());
        $(this).val(newVal.toFixed(0) + " %");

        var bondVal = 100 - newVal;
        $(this).parent()
        .find(".stocks")
        .val(bondVal.toFixed(0) + " %")
        .effect("highlight", { color: '#84b1f9'}, 3000); // Thats like a lightish blueish color.
    });

    balanceWeights();
}

$(document).ready(function (e) {
    $('.caSelect').click(function () {
        addStrategy("ConstAmount", "const_amount", $(".CreateSimulation").first(), 0);
    });
});

$(document).ready(function (e) {
    $('.cpSelect').click(function () {
        addStrategy("ConstPercent", "const_percent", $(".CreateSimulation").first(), 0);
    });
});

$(document).ready(function (e) {
    $('.gkSelect').click(function () {
        addStrategy("GuytonKlinger", "guyton_klinger", $(".CreateSimulation").first(), 0);
    });
});

$(document).ready(function (e) {
    $('.CreateSimulation').find('input[name=initial_portfolio_value]').change(function () {
        portfolioChange($(this), 0);
    });

    $('.CreateSimulation').find('input[name=initial_portfolio_value]').focus(function () {
        $(this).data('oldVal', parseFloat($(this).val()));
    });
});

function portfolioChange(inputDiv, strategyIndex){
    var oldVal = parseFloat(inputDiv.data('oldVal'));
    var newVal = parseFloat($(inputDiv).val());

    if (newVal == oldVal){
        return;
    }

    var ratio = newVal / oldVal;

    $('.Strategy').each(function (){
        if (Number($(this).data("strategyIndex")) == strategyIndex){
            $(this).find('.GuytonKlinger :input').each(function (){
                var old = $(this).val();
                $(this).val(parseFloat(old) * ratio).effect("highlight", { color: '#84b1f9'}, 3000);
            });

            $(this).find('.ConstAmount :input').each(function (){
                var old = $(this).val();
                $(this).val(parseFloat(old) * ratio).effect("highlight", { color: '#84b1f9'}, 3000);
            });
        }
    });
}

function balanceWeights() {
    $(':input').stop(true, true);
    for (i = 0; i < 2; i++){
        var weightCount = 0;
        var roundingError = 100.0;
        var accountedFor = 0.0;

        $('.weight').each(function (){
            if (Number($(this).parent().parent().data("strategyIndex")) == i){
                if ($(this).data("manualChange")){
                    accountedFor += parseFloat($(this).val());
                } else {
                    weightCount++;
                }
            }
        });

        if (accountedFor > 100.0){
            accountedFor = 0.0;
            $('.weight').each(function (){
                if (Number($(this).parent().parent().data("strategyIndex")) == i){
                    $(this).data("manualChange", false)
                }
            });
        }

        var lastWeightChanged = null;
        $('.weight').each(function (){
            if (Number($(this).parent().parent().data("strategyIndex")) == i){
                if (!$(this).data("manualChange")){
                    var newString = ((100.0-accountedFor)/weightCount).toFixed(0) + " %";
                    if ($(this).val() != newString){
                        $(this).val(newString);
                       lastWeightChanged = $(this);
                    }
                }

                roundingError -= parseFloat($(this).val());
           }
        });

        if (lastWeightChanged != null){
            var newVal = parseFloat(lastWeightChanged.val());
            newVal += roundingError;
            lastWeightChanged.val(newVal.toFixed(0) + " %");
        }

        $('.weight').each(function (){
            if (Number($(this).parent().parent().data("strategyIndex")) == i){
                weightChanged($(this));
            }
        });
    }
}

function weightChanged(weightInputReference) {
    var oldVal = parseFloat(weightInputReference.data('oldVal'));
    var newVal = parseFloat($(weightInputReference).val());
    $(weightInputReference).data('oldVal', newVal);

    if (newVal == oldVal){
        return;
    }

    var ratio = newVal / oldVal;

    $(weightInputReference).effect("highlight", { color: '#84b1f9'}, 3000);

    $(weightInputReference).parent().parent().find('.GuytonKlinger :input').each(function (){
        var old = $(this).val();
        $(this).val((parseFloat(old) * ratio).toFixed(0)).effect("highlight", { color: '#84b1f9'}, 3000);
    });

    $(weightInputReference).parent().parent().find('.ConstAmount :input').each(function (){
        var old = $(this).val();
        $(this).val((parseFloat(old) * ratio).toFixed(0)).effect("highlight", { color: '#84b1f9'}, 3000);
    });
}