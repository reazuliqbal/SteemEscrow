var transaction = {};

// Getting agents list from a JSON file or can be an API
$.getJSON('agents.json', function(agents_data) {

    var agent_names = agents_data.map(function(value){return value.name;});

    steem.api.getAccounts(agent_names, function(err, result) {
        if(!err) {
            $.each(result, function(index, data) {

                $('#agent').append('<option value="'+ data.name +'" data-fee="'+ agents_data[index].fee +'">'+ data.name +' ('+ calcRep(data.reputation) +') Fee: '+ agents_data[index].fee +'</option>');
            });
        }
    });
});

// Checking if user exists, if yes then shows balnce and add max limit in the amount input.
function getBalance(name, input, show_balance) {

    var parent = input.parents('.form-group');

    steem.api.getAccounts([name], function(err, response) {
        if( !err && response.length ) {
            parent.removeClass('has-error').addClass('has-success');

            if (show_balance) {
                var steem = response[0].balance.split(' ');
                var sbd = response[0].sbd_balance.split(' ');

                parent.find('.help-block').remove();
                parent.append('<p class="help-block">User has '+ response[0].balance +' and '+ response[0].sbd_balance +'</p>');

                if($('#amount').data('maxSteem') == null) {
                    $('#amount').data({'maxSteem': steem[0], 'maxSbd': sbd[0]});
                }
            }
        } else {
            parent.removeClass('has-success').addClass('has-error')
        }
    });
}

// Calling getBalance function when user finishes typing
var timeout = null;
$('#sender, #recipient').on('input', function() {
    var input = $(this);
    clearTimeout(timeout);
    timeout = setTimeout(function () {
        getBalance(input.val(), input, true);
    }, 500);
});

// Validating how much max STEEM or SBD can be sent after agent fee
$('#amount').keyup(function() {
    var input = $(this);
    var parent = input.parents('.form-group');
    var error;

    if($('#currency option:selected').val() === 'STEEM') {
        (parseFloat(input.val()) > parseFloat(input.data('maxSteem'))) ? error = 'Maximum of '+ input.data('maxSteem') +' STEEM can be sent after agent fee.' : error = '';
    } else if($('#currency option:selected').val() === 'SBD') {
        (parseFloat(input.val()) > parseFloat(input.data('maxSbd'))) ? error = 'Maximum of '+ input.data('maxSbd') +' SBD can be sent after agent fee.' : error = '';
    }
    if ( error != '') {
        parent.find('.help-block').remove();
        parent.removeClass('has-success').addClass('has-error');
        parent.append('<p class="help-block">' + error + '</p>');
    } else {
        parent.find('.help-block').remove();
        parent.removeClass('has-error').addClass('has-success');
    }
});

// Formating Amount and Fees to 3 decimal point
$('#amount, #fee').focusout(function() {
    var parent = $(this).parents('.form-group');

    if (/^[+-]?\d+(\.\d+)?$/.test($(this).val())) {
        var number = parseFloat($(this).val()).toFixed(3);
        $(this).val(number);

        parent.find('.help-block').remove();
    } else {
        parent.find('.help-block').remove();
        parent.removeClass('has-success').addClass('has-error');
        parent.append('<p class="help-block">Please enter a number.</p>');
    }
});

$('#currency').change(function(event) {
    $('#amount').keyup();
});

// Filling up fee field with select agent's fee
$('#agent').change(function(event) {
    var fee = parseFloat($('#agent option:selected').data('fee')).toFixed(3);
    var max_steem = parseFloat($('#amount').data('maxSteem')) - fee;
    var max_sbd = parseFloat($('#amount').data('maxSbd')) - fee;

    $('#amount').data({'maxSteem': max_steem, 'maxSbd': max_sbd});
    $('#fee').val(fee);
});

// Checking if the Active Key is a WIF
timeout = null;
$('#active_key').on('input', function() {
    var input = $(this);
    var parent = input.parents('.form-group');
    clearTimeout(timeout);
    timeout = setTimeout(function () {
        var error = [];

        if($('#sender').val() != '') {

            if( steem.auth.isWif(input.val()) ) {

                steem.api.getAccounts([$('#sender').val()], function(err, response) {
                    if( !err && response.length ) {
                        if( steem.auth.wifIsValid(input.val(), response[0]['active']['key_auths'][0][0]) ) {
                            parent.find('.help-block').remove();
                            parent.removeClass('has-error').addClass('has-success');
                        } else {
                            parent.find('.help-block').remove();
                            parent.removeClass('has-success').addClass('has-error');
                            parent.append('<p class="help-block">This WIF is not yours, please <a href="https://steemit.com/@'+ $('#sender').val() +'/permissions">click here</a> to find yours.</p>');
                        }
                    }
                });
            } else {
                error = 'Please enter a valid Active WIF.';
            }
        } else {
            error = 'Please fill out sender name first.';
        }

        if ( error.length > 0) {
            parent.find('.help-block').remove();
            parent.removeClass('has-success').addClass('has-error');
            parent.append('<p class="help-block">' + error + '</p>');
        } else {
            parent.find('.help-block').remove();
            parent.removeClass('has-error').addClass('has-success');
        }
    }, 500);
});

// Escrow transafer form handling
$('#escrowTransfer').submit(function(event) {

    var from        = $('#sender').val(),
        to          = $('#recipient').val(),
        wif         = $('#active_key').val(),
        agent       = $('#agent').val(),
        escrowId    = parseInt(Math.random() * (99999999 - 10000000) + 10000000),
        sbdAmount   = '0.000 SBD',
        steemAmount = '0.000 STEEM',
        amount      = parseFloat($('#amount').val()).toFixed(3),
        currency    = $('#currency option:selected').val(),
        fee         = parseFloat($('#fee').val()).toFixed(3) + ' ' + currency,
        jsonMeta    = JSON.stringify({
            terms: $('#terms').val()
        });

        if( currency == 'STEEM') {
            steemAmount = amount + ' ' + currency;
        } else {
            sbdAmount = amount + ' ' + currency;
        }

    steem.api.getDynamicGlobalProperties(function(err, response) {

        var ratificationDeadline = new Date(response.time+'Z');
        ratificationDeadline.setMinutes(ratificationDeadline.getMinutes() + parseInt($('#deadline').val()) * 60 - 1);

        var escrowExpiration = new Date(response.time+'Z');
        escrowExpiration.setHours(escrowExpiration.getHours() + parseInt($('#expiration').val()));


        steem.broadcast.escrowTransfer(wif, from, to, agent, escrowId, sbdAmount, steemAmount, fee, ratificationDeadline, escrowExpiration, jsonMeta, function(err, response) {

            if(!err && response.ref_block_num) {
                var cp_url = window.location.href +'?escrowId='+ escrowId +'&sender='+ from;
                $('#alert').addClass('alert-success').append('Escrow request has be created successfully. ID:' + escrowId +'<br>Control Panel URL: <a href="'+ cp_url +'">'+ cp_url +'</a><br>Send this link to receiver and escrow agent for their approval.').fadeIn();

            } else {
                console.error(err);

                if(err.payload !== undefined) {
                    $('#alert').addClass('alert-danger').append(err.payload.error.message.replace(/([^>])\n/g, '$1<br><br>')).fadeIn();
                } else {
                    $('#alert').addClass('alert-danger').append(err).fadeIn();
                }
            }
        });
    });

    event.preventDefault();
});

// Reputation calculation helper
function calcRep(rep) {
    return (Math.max(Math.log10(Math.abs(parseInt(rep))) - 9, 0) * (parseInt(rep) > 0 ? 1 : -1) * 9 + 25).toFixed(1);
}

// Date formating helper
function niceDate(time) {
    var options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };

    return new Date(time+'Z').toLocaleDateString("en-US",options);
}
// URL parameter helper
function getUrlParam(name) {
    var results = new RegExp('[\\?&]' + name + '=([^&#]*)').exec(window.location.href);
    return (results && results[1]) || undefined;
}


if ( getUrlParam('escrowId') === undefined ) {
    $('#escrowTransfer').removeClass('hidden').fadeIn('slow');
} else {

    var escrowId    = getUrlParam('escrowId'),
        sender      = getUrlParam('sender');

    if ( Math.floor(escrowId) == escrowId && $.isNumeric(escrowId) ) {

        steem.api.getEscrow(sender, escrowId, function(err, response) {

            if(response) {
                $('#escrowControlPanel').removeClass('hidden').fadeIn('slow');


                var escrow_id = response.escrow_id,
                    agent = response.agent,
                    agent_approved = response.agent_approved
                    disputed = response.disputed,
                    escrow_expiration = response.escrow_expiration,
                    from = response.from,
                    id = response.id,
                    pending_fee = response.pending_fee,
                    ratification_deadline = response.ratification_deadline,
                    sbd_balance = response.sbd_balance,
                    steem_balance = response.steem_balance,
                    to = response.to,
                    to_approved = response.to_approved,

                    escrow_status = "",
                    escrow_amount = "",
                    escrow_terms = "";



                steem.api.getAccountHistory(
                            from,
                            -1,
                            100,
                            function(err, response) {
                                if(!err && response.length) {
                                    $.each(response, function(index, val) {
                                        if(val[1]['op'][0] == 'escrow_transfer') {
                                            if(parseInt(val[1]['op'][1]['escrow_id']) == parseInt(escrow_id)) {
                                                escrow_terms = $.parseJSON(val[1]['op'][1]['json_meta']);
                                            }
                                        }
                                    });
                                    $('#escrow_terms').html(escrow_terms.terms !== undefined ? escrow_terms.terms : JSON.stringify(escrow_terms));
                                }
                            }
                    );

                if( sbd_balance !== "0.000 SBD" ) {
                    escrow_amount = sbd_balance;
                } else {
                    escrow_amount = steem_balance;
                }

                $('#receiverApprove').data({'user': to, 'action': 'approval', 'approve': 1});
                $('#receiverDisapprove').data({'user': to, 'action': 'approval', 'approve': 0});
                $('#agentApprove').data({'user': agent, 'action': 'approval', 'approve': 1});
                $('#agentDisapprove').data({'user': agent, 'action': 'approval', 'approve': 0});
                $('#senderDispute').data({'user': from, 'action': 'dispute', 'dispute': 1});
                $('#receiverDispute').data({'user': to, 'action': 'dispute', 'dispute': 1});

                $('#senderRelease').data({'user': from, 'action': 'release', 'release': to});
                $('#receiverRelease').data({'user': to, 'action': 'release', 'release': from});
                $('#agentRelease').data({'user': agent, 'action': 'agent_release', 'from': from, 'to': to});

                $('#receiverApprove, #receiverDisapprove, #agentApprove, #agentDisapprove, #agentRelease, #senderRelease, #receiverRelease, #senderDispute, #receiverDispute').hide();

                var sender_action   = "",
                    receiver_action = "",
                    agent_action    = "";

                steem.api.getDynamicGlobalProperties(function(err, response) {

                    var transactionDateExpire = new Date(escrow_expiration + 'Z');

                    if( !agent_approved && !to_approved ) {
                        $('#receiverApprove, #receiverDisapprove, #agentApprove, #agentDisapprove').show();
                        escrow_status = "Waiting for agent and recipient's approval.";
                        sender_action = 'No action needed.'
                    } else if( agent_approved && !to_approved ) {
                        $('#receiverApprove, #receiverDisapprove').show();
                        sender_action = 'No action needed.';
                        agent_action = 'No action needed.';
                        escrow_status = "Waiting for recipient's approval.";
                    } else if( !agent_approved && to_approved ) {
                        $('#agentApprove, #agentDisapprove').show();
                        escrow_status = "Waiting for agent's approval.";
                        sender_action = 'No action needed.';
                        receiver_action = 'No action needed.';
                    } else if( disputed ) {
                        $('#agentRelease').show();
                        escrow_status = "Transaction has been disputed.";
                        sender_action = 'No action needed. Wait for agent to make decision.';
                        receiver_action = 'No action needed. Wait for agent to make decision.';
                    } else if (transactionDateExpire < response.time) {
                        $('#senderRelease, #receiverRelease').show();
                        escrow_status = 'Escrow has been expired.';
                        agent_action = 'No action needed.';
                    } else {
                        $('#senderDispute, #receiverDispute, #senderRelease, #receiverRelease').show();
                        escrow_status = 'Transaction has been approved.';
                        agent_action = 'No action needed.';
                    }

                    $('#sender_action').text(sender_action);
                    $('#receiver_action').text(receiver_action);
                    $('#agent_action').text(agent_action);

                    $('#escrow_status').text(escrow_status);
                    $('#blockchain_date').text(niceDate(response.time));
                });

                $('#escrow_id').text(escrow_id);
                $('#escrow_amount').text(escrow_amount);
                $('#agent_fee').text(pending_fee).append('<span class="glyphicon glyphicon-info-sign" data-toggle="tooltip" data-placement="right" title="After approval fee will be transferred to agent."></span>');
                $('#approval_deadline').text(niceDate(ratification_deadline)).append('<span class="glyphicon glyphicon-info-sign" data-toggle="tooltip" data-placement="right" title="Receipient and agent should approve the escrow before this date."></span>');
                $('#expiration_date').text(niceDate(escrow_expiration)).append('<span class="glyphicon glyphicon-info-sign" data-toggle="tooltip" data-placement="right" title="Escrow warranty by the agent will be over after this date."></span>');

                $('#sender_name').append('<a href="https://steemit.com/@'+from+'">@'+from+'</a>');
                $('#receiver_name').append('<a href="https://steemit.com/@'+to+'">@'+to+'</a>');
                $('#agent_name').append('<a href="https://steemit.com/@'+agent+'">@'+agent+'</a>');


                transaction.submitApprove = function(login, active_key, approve, callback) {
                    steem.broadcast.escrowApprove(
                        active_key,
                        from,
                        to,
                        agent,
                        login,
                        escrow_id,
                        approve,
                        function(err, response) {
                            callback();
                        }
                    );
                }

                transaction.submitRelease = function(login, active_key, callback) {
                    steem.broadcast.escrowRelease(
                        active_key,
                        from,
                        to,
                        agent,
                        login,
                        login == from ? to : from,
                        escrow_id,
                        sbd_balance,
                        steem_balance,
                        function(err, response) {
                            callback();
                        }
                    );
                }

                transaction.submitExpired = function(login, active_key, callback) {
                    steem.broadcast.escrowRelease(
                        active_key,
                        from,
                        to,
                        agent,
                        login,
                        login == from ? from : to,
                        escrow_id,
                        sbd_balance,
                        steem_balance,
                        function(err, response) {
                            callback();
                        }
                    );
                }

                transaction.submitDispute = function(login, active_key, callback) {
                    steem.broadcast.escrowDispute(
                        active_key,
                        from,
                        to,
                        agent,
                        login,
                        escrow_id,
                        function(err, response) {
                            callback();
                        }
                    );
                }

                transaction.submitEscrow = function(login, active_key, reciever, callback) {
                    steem.broadcast.escrowRelease(
                        active_key,
                        from,
                        to,
                        agent,
                        login,
                        reciever,
                        escrow_id,
                        sbd_balance,
                        steem_balance,
                        function(err, response) {
                            callback();
                        }
                    );
                }
            } else {
                if(err) {
                    console.log(err);
                }
                $('#alert').addClass('alert-warning').append("There was a problem loading the transaction. Either it doesn't exists or completed or receiver or agent hadn't approved the transaction. Please contact other parties and create a new transaction.");
            }
        });
    }
}

// Action form submission helper
$('#actionForm').submit(function(event) {
    event.preventDefault();

    var user            = $('#user').val();
    var active_key      = $('#wif').val();
    var action          = $('#action').val();
    var action_value    = $('#action_value').val();
    var release_to      = $('#release_to').val();

    if(action === 'approval') {
        action_value = Boolean(Number(action_value));

        if(typeof(action_value) == typeof(true)) {
            transaction.submitApprove(
                user,
                active_key,
                action_value,
                function(err, response) {
                    $('#actionModal').modal('hide');
                    location.reload();
                }
            );
        }
    } else if(action === 'dispute') {
        transaction.submitDispute(
            user,
            active_key,
            function(err, response) {
                $('#actionModal').modal('hide');
                location.reload();
            }
        );
    } else if(action === 'release') {
        transaction.submitRelease(
            user,
            active_key,
            function(err, response) {
                $('#actionModal').modal('hide');
                location.reload();
            }
        );
    } else if(action === 'agent_release') {
        transaction.submitEscrow(
            user,
            active_key,
            release_to,
            function(err, response) {
                $('#actionModal').modal('hide');
                location.reload();
            }
        );
    }
});

// Creating modal for confirmation and getting active key
$('#actionModal').on('show.bs.modal', function (event) {
    var btn = $(event.relatedTarget);
    var user = btn.data('user');
    var action = btn.data('action');

    var modal = $(this);
    modal.find('.modal-body input#action').val(action);
    modal.find('.modal-body input#user').val(user);

    var submit_btn = modal.find('button[type="submit"]');

    if(action === 'approval') {
        if(btn.data('approve') == 0 ) {
            modal.find('.modal-title').text('Are you sure you want to disapprove this transaction?');
            submit_btn.addClass('btn-danger').text('Dispprove');
        } else {
            modal.find('.modal-title').text('Are you sure you want to approve this transaction?');
            submit_btn.addClass('btn-success').text('Approve');
        }
        modal.find('.modal-body input#action_value').val(btn.data('approve'));
    }
    else if(action === 'dispute') {
        modal.find('.modal-title').text('Are you sure you want to dispute this transaction?');
        submit_btn.addClass('btn-danger').text('Dispute');
    }
    else if(action === 'release') {
        var release = btn.data('release');
        modal.find('.modal-title').html('Are you sure you want to release the fund to <a href="https://steemit.com/@'+ release +'">@'+ release +'</a>?');
        submit_btn.addClass('btn-info').text('Release');
    }
    else if(action === 'agent_release') {
        modal.find('.modal-title').text('Are you sure you want to release the fund?');
        var to = btn.data('to');
        var from = btn.data('from');
        modal.find('.modal-body').append('<div class="form-group"><label>Release To</label><br><div class="radio"><label><input type="radio" id="release_to" name="release_to" value="'+ to +'">Reciever ('+ to +')</div></label><div class="radio"><label><input type="radio" id="release_to" name="release_to" value="'+ from +'">Sender ('+ from +')</label></div></div>');
        submit_btn.addClass('btn-info').text('Release');
    }
});

// Resetting form value on modal
$('#actionModal').on('hidden.bs.modal', function (event) {
    var modal = $(this);
    modal.find('.modal-body input#action').val('');
    modal.find('.modal-body input#user').val('');
    modal.find('.modal-body input#wif').val('');
    modal.find('.modal-body .has-success').removeClass('has-success');
    modal.find('.modal-body .has-error').removeClass('has-error');
    modal.find('.modal-body p.help-block').remove();
    modal.find('button[type="submit"]').removeClass('btn-success btn-danger btn-info');
});

// Enabling Bootstrap 3 tooltip
$(document).ready(function() {
    $("body").tooltip({ selector: '[data-toggle=tooltip]' });
});
