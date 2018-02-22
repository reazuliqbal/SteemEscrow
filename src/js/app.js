// STEEM cofig for test chain
steem.api.setOptions({ url: 'wss://testnet.steem.vc' });
steem.config.set('address_prefix', 'STX');
steem.config.set('chain_id', '79276aea5d4877d9a25892eaa01b0adf019d3e5cb12a97478df3298ccdd01673');

var transaction = {};

// Getting agents list from a JSON file or can be an API
function getAgents() {

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
}
getAgents();

// Reputation calculation helper
function calcRep(rep) {
    return (Math.max(Math.log10(Math.abs(parseInt(rep))) - 9, 0) * (parseInt(rep) > 0 ? 1 : -1) * 9 + 25).toFixed(1);
}

$('#agent').change(function(event) {
    $('#fee').val($('#agent option:selected').data('fee'));
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
                    console.log(err);

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
                $('#agent_fee').text(pending_fee);
                $('#approval_deadline').text(niceDate(ratification_deadline));
                $('#expiration_date').text(niceDate(escrow_expiration));

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
                    $('#actionMdal').modal('hide');
                    location.reload();
                }
            );
        }
    } else if(action === 'dispute') {
        transaction.submitDispute(
            user,
            active_key,
            function(err, response) {
                $('#actionMdal').modal('hide');
                location.reload();
            }
        );
    } else if(action === 'release') {
        transaction.submitRelease(
            user,
            active_key,
            function(err, response) {
                $('#actionMdal').modal('hide');
                location.reload();
            }
        );
    } else if(action === 'agent_release') {
        transaction.submitEscrow(
            user,
            active_key,
            release_to,
            function(err, response) {
                $('#actionMdal').modal('hide');
                location.reload();
            }
        );
    }
});