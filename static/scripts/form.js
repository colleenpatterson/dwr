function getJsonRequest(createDiv) {
    var data = {}

    createDiv.find(".input_main").each(function () {
        data[this.name] = this.value
    });

    data['strategies'] = [];
    createDiv.nextUntil(".CreateSimulation").each(function () {
        if ($(this).is(":visible") && $(this).attr('class') == "Strategy") { //There is certainly a jquery'er way to do this.
            var strat = {};
            var assets = [];
            $(this).find(".input_strat").each(function() {
                strat['args'] = {};
                strat['args'][this.name] = this.value;

                strat["type"] = $(this).data("type");
            });

            $(this).find(".weight").each(function() {
                strat["weight"] = this.value;
            });

            $(this).find(".stocks").each(function() {
                assets.push(this.value);
            });

            $(this).find(".bonds").each(function() {
                assets.push(this.value);
            });

            strat["asset_allocation"] = assets;
            strat["type"] = $(this).data("type");
            data['strategies'].push(strat)
        }
    });
    var j = JSON.stringify(data);
    console.log(j);
    return j;
}

var tempHiddenStrats = [];
$(document).ready(function () {
    $('.runSimButt').click(function () {
        $("#simgraph").remove();
        $(".showParamsButt").remove();
        $(".reAnimateButt").remove();

        var body = $("#actualBody");

        var data = {};
        tempHiddenStrats.push($(".CreateSimulation"));
        $(".Strategy:visible").each(function () {
            tempHiddenStrats.push($(this));
        });

        requests = [];
        $(document).find(".CreateSimulation").each(function (){
            requests.push(getJsonRequest($(this)));
        });

        $("<label type=\"submit\" class=\"showParamsButt\">+</label>").appendTo(body).click(function() {
            for (var i = 0; i< l; i++){
                tempHiddenStrats[i].toggle(200);
            }

            if ($(".showParamsButt").text() == "+"){
                $(".showParamsButt").text("-");
            } else {
                $(".showParamsButt").text("+");
            }
        });

        $("<label type=\"submit\" class=\"reAnimateButt\">Restart Animation</label>").hide().appendTo(body).click(function() {
            sim.animate();
        });

        $("<p id=\"simgraph\"></p>").appendTo(body);

        $.ajax({
            type: 'POST',
            url: '/simulations',
            data: requests[0],
            contentType: "application/json",
            dataType: 'json',
            success: function(data) {
                if (requests.length == 2) {
                    $.ajax({ // TODO: stop...it...find the right way to do these in parallel...
                        type: 'POST',
                        url: '/simulations',
                        data: requests[1],
                        contentType: "application/json",
                        dataType: 'json',
                        success: function(data2) {
                            console.log('data: ' + JSON.stringify(data));
                            console.log('data2: ' + JSON.stringify(data2));
                            sim.init();
                            sim.showSimulation(data, data2);
                            $(".reAnimateButt").show();
                        }
                    });

                } else {
                    console.log('data: ' + JSON.stringify(data));
                    sim.init();
                    sim.showSimulation(data);
                    $(".reAnimateButt").show();
                }
            }
        });

        var l = tempHiddenStrats.length;
        for (var i = 0; i< l; i++){
            tempHiddenStrats[i].hide(200);
        }
    });
});

$(document).ready(function () {
    $('.compareButt').click(function () {
        var newCreateDiv = $("#createClone").clone().removeAttr('id').insertAfter(".compareButt").show('slow');
        newCreateDiv.find('.caSelect').click(function () {
            addStrategy("ConstAmount", "const_amount", $(".CreateSimulation").last());
        });
        newCreateDiv.find(".cpSelect").click(function () {
            addStrategy("ConstPercent", "const_percent", $(".CreateSimulation").last());
        });
        newCreateDiv.find('.gkSelect').click(function () {
            addStrategy("GuytonKlinger", "guyton_klinger", $(".CreateSimulation").last());
        });
    });
});

var strategyCount = 0;
function addStrategy(c, t, after){
    var newStratDiv = $("#stratClone").clone().removeAttr('id').insertAfter(after).show('slow');
    $(newStratDiv).data("type", t);
    $("<legend>" + c + "</legend>").appendTo(newStratDiv.find('.stratFieldset'));
    $("." + c).last().clone().appendTo(newStratDiv.find('.stratFieldset')).show('slow');
    $(newStratDiv).find(".removeStrategyButt").click(function(){
        $(this).parent().parent().parent().remove()
        strategyCount--;
        if (strategyCount <= 0){
            strategyCount = 0;
            $(".runSimButt").hide('slow');
            $(".compareButt").hide('slow');
        }
    });

    $(".runSimButt").show();
    $(".compareButt").show();
    strategyCount++;
}

$(document).ready(function (e) {
    $('.caSelect').click(function () {
        addStrategy("ConstAmount", "const_amount", $(".CreateSimulation").first());
    });
});

$(document).ready(function (e) {
    $('.cpSelect').click(function () {
        addStrategy("ConstPercent", "const_percent", $(".CreateSimulation").first());
    });
});

$(document).ready(function (e) {
    $('.gkSelect').click(function () {
        addStrategy("GuytonKlinger", "guyton_klinger", $(".CreateSimulation").first());
    });
});