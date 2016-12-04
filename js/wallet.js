/*!
 * Wallet Javascript
 */

// Setup some short aliases
var ls = localStorage,
    ss = sessionStorage,
    bc = bitcore;

// Public server config used to generate unsigned wallet transactions
WALLET_SERVER_INFO = {
    mainnet: {
        host: 'public.coindaddy.io',
        port: 4001,                 
        user: 'rpc',                
        pass: '1234',               
        ssl: true                   
    },
    testnet: {
        host: 'public.coindaddy.io',
        port: 14001,                
        user: 'rpc',                
        pass: '1234',               
        ssl: true                   
    }
};

$( document ).ready(function(){
    // Setup click listeners on the wallet buttons
    $('#walletAbout').click(function(){         dialogAbout(); });
    $('#walletAddress').click(function(){       dialogAddress(); });
    $('#walletChangeAddress').click(function(){ dialogChangeAddress(); });
    $('#walletPassword').click(function(){      dialogPassword( true ); });
    $('#walletLock').click(function(){          dialogLock(); });
    $('#walletUnlock').click(function(){        dialogPassword(); });
    $('#walletPassphrase').click(function(){    dialogPassphrase(); });
    $('#walletReset').click(function(){         dialogReset(); });
    // Initialize the wallet 
    initWallet();
});

// Initialize / Load the wallet
function initWallet(){
    if(ss.getItem('wallet') == null){
        if(ls.getItem('wallet')){
            if(ls.getItem('walletEncrypted')=='true'){
                if(ss.getItem('skipWalletAuth')!='true')
                    dialogPassword();
            } else {
                decryptWallet();
            }
        } else {
            createWallet();
        }
    } else {
        checkUpdateWallet()
        setInterval(checkUpdateWallet, 60000);
    }
    updateWalletOptions();
    updateWalletBalanceInfo();
}

// Reset/Remove wallet
function resetWallet(){
    ls.removeItem('wallet');
    ls.removeItem('walletPassword');
    ls.removeItem('walletEncrypted');
    ls.removeItem('walletBalancesLastUpdated');
    ss.removeItem('wallet');
    ss.removeItem('skipWalletAuth');

}

// Check if wallet price/balance info should be updated
function checkUpdateWallet(){
    updateWalletPrices();
    updateWalletBalances(getWalletAddress());
};

// Create HD wallet
function createWallet( passphrase ){
    var m = new Mnemonic(128);
    if(passphrase)
        m = Mnemonic.fromWords(passphrase.trim().split(" "));
    var h = m.toHex(),
        k = Math.random().toString(36).substring(3),
        e = CryptoJS.AES.encrypt(h, String(k)).toString();
    ls.setItem('wallet', e);
    ss.setItem('wallet', h);
    ls.setItem('walletPassword', k);
    ls.setItem('walletEncrypted',false);
    ss.removeItem('skipWalletAuth');
    // Set current address to first address in wallet
    setWalletAddress(getWalletAddress(0));
}

// Decrypt wallet
function decryptWallet( password ){
    var w = ls.getItem('wallet'),
        k = (password) ? password : ls.getItem('walletPassword'),
        h = CryptoJS.AES.decrypt(w, String(k)).toString(CryptoJS.enc.Utf8);
    ss.setItem('wallet', h);
    ss.removeItem('skipWalletAuth');
}

// Decrypt wallet
function encryptWallet( password ){
    var w = getWallet(),
        k = (password) ? password : ls.getItem('walletPassword'),
        e = CryptoJS.AES.encrypt(w, String(k)).toString(),
        p = CryptoJS.AES.encrypt(k, String(k)).toString();
    ls.setItem('wallet', e);
    ls.setItem('walletEncrypted',true);
    ls.setItem('walletPassword', p);
    ss.removeItem('skipWalletAuth');
}

// Get decrypted wallet from sessionStorage
function getWallet(){
    return ss.getItem('wallet');
}

// Handle locking wallet by removing decrypted wallet from sessionStorage
function lockWallet(){
    ss.removeItem('wallet');
}

// Get 12-word passphrase
function getWalletPassphrase(){
    var w = getWallet();
    if(w)
        return Mnemonic.fromHex(w).toWords().toString().replace(/,/gi, " ");
    return false;
}

// Get wallet addresses using given index 
function getWalletAddress( index ){
    if(typeof index === 'number'){
        // var type
        var w = getWallet(),
            a = null;
        if(w){
            k = bc.HDPrivateKey.fromSeed(w, NETWORK),
            d = k.derive("m/0'/0/" + index),
            a = bc.Address(d.publicKey, NETWORK).toString();
        }
        return a;
    } else {
        return ls.getItem('walletAddress');
    }
}

// Set wallet address
function setWalletAddress( address ){
    ls.setItem('walletAddress', address);
}

// Validate wallet password
function isValidWalletPassword( password ){
    var p = ls.getItem('walletPassword'),
        d = false;
    // Try to decrypt the encrypted password using the given password
    try {
        d = CryptoJS.AES.decrypt(p, String(password)).toString(CryptoJS.enc.Utf8);
    } catch(e){
    }
    if(d==password)
        return true
    return false;
}

// Validate wallet passphrase
function isValidWalletPassphrase( passphrase ){
    var arr   = passphrase.trim().split(" "),
        valid = true;
    if(arr.length<12)
        valid = false;
    for(var i=0;i<arr.length;i++){
        if($.inArray(arr[i], Mnemonic.words)==-1)
            valid = false;
    }
    return valid;
}

// Display correct wallet options based on wallet status
function updateWalletOptions(){
    if(ss.getItem('skipWalletAuth') || !ss.getItem('wallet')){
        $('#walletUnlock').show();
        $('#walletReset').show();
        $('#walletQRcode').hide();
        $('#walletAbout').hide();
        $('#walletAddress').hide();
        $('#walletChangeAddress').hide();
        $('#walletPassphrase').hide();
        $('#walletPassword').hide();
        $('#walletLock').hide();
        $('.wallet-header').hide();
        $('.wallet-balance').hide();
    } else {
        $('#walletUnlock').hide();
        $('#walletQRcode').show();
        $('#walletAbout').show();
        $('#walletAddress').show();
        $('#walletChangeAddress').show();
        $('#walletPassphrase').show();
        $('#walletReset').show();
        $('.wallet-header').show();
        $('.wallet-balance').show();
        // Display 'Lock Wallet' or 'Enable Password' option
        if(ls.getItem('walletEncrypted')=='true'){
            $('#walletPassword').hide();
            $('#walletLock').show();
        } else {
            $('#walletPassword').show();
            $('#walletLock').hide();
        }
    }
}

// Update address balances
function updateWalletBalances( address, force ){
    var last = ls.getItem('walletBalancesLastUpdated') || 0,
        ms   = 300000; // 5 minutes
    // BTC Balance
    if((parseInt(last) + ms)  <= Date.now() || force ){
        $.getJSON( "https://btc.blockr.io/api/v1/address/info/" + address, function( data ){
            var bal = (data.data.balance) ? numeral(data.data.balance).format('0.00000000') : '0.00000000',
                obj = {
                    'BTC': bal
                };
            ls.setItem('walletBalances', JSON.stringify(obj));
            ls.setItem('walletBalancesLastUpdated', Date.now());
            updateWalletBalanceInfo();
        });
    }
}

// Update currency prices
function updateWalletPrices( force ){
    var last = ls.getItem('walletPricesLastUpdated') || 0,
        ms   = 300000; // 5 minutes
    if((parseInt(last) + ms)  <= Date.now() || force ){
        // BTC/USD Price
        $.getJSON( "https://api.coinmarketcap.com/v1/ticker/", function( data ){
            if(data && data.length){
                var arr = ['BTC','XCP'],
                    obj = {};
                data.forEach(function(item){
                    if(arr.indexOf(item.symbol)!=-1){
                        obj[item.symbol] = {
                            'BTC': item.price_btc,
                            'USD': item.price_usd
                        }
                    }
                });
                ls.setItem('walletPrices',JSON.stringify(obj));
                ls.setItem('walletPricesLastUpdated', Date.now());
                updateWalletBalanceInfo();
            }
        });
    }
}

// Update the displayed balance information
function updateWalletBalanceInfo(){
    var prices   = JSON.parse(ls.getItem('walletPrices')),
        balances = JSON.parse(ls.getItem('walletBalances'));
    // console.log('updateWalletBalanceInfo', prices, balances);
    if(prices && balances){
        var btc = balances['BTC'],
            usd = prices['BTC']['USD'];
        $('#btc-balance').html(numeral(btc).format('0,0.00000000'));
        $('#fiat-balance').html(numeral(btc * usd).format('0,0.00'));
    }
}

// Display error message and run callback (if any)
function cbError(msg, callback){
    dialogMessage(null, msg, true);
    if(typeof callback === 'function')
        callback();
}

// Convert an amount to satoshis
function getSatoshis(amount){
    var num = numeral(amount);
    if(/\./.test(amount))
        num.multiply(100000000);
    return parseInt(num.format('0'));
}

// Get private key for a given network and address
function getPrivateKey(network, address){
    var wallet = getWallet(),
        net    = (network=='testnet') ? 'testnet' : 'livenet',
        key    = bitcore.HDPrivateKey.fromSeed(wallet, bitcore.Networks[net]),
        priv   = false;
    for(var i = 0; i < 25 && priv==false; i++){
        var d = key.derive("m/0'/0/" + i),
            a = bitcore.Address(d.publicKey, bitcore.Networks[net]).toString();
        if(a==address)
            priv = d.privateKey.toWIF();
    }
    return priv;
}


/*
 * Counterparty related functions
 */


// Handle generating a send transaction
function cpSend(network, source, destination, currency, amount, fee, callback){
    var cb  = (typeof callback === 'function') ? callback : false;
    // Create unsigned send transaction
    createSend(network, source, destination, currency, getSatoshis(amount), fee, function(o){
        if(o && o.result){
            // Sign the transaction
            signTransaction(network, source, o.result, function(signedTx){
                if(signedTx){
                    // Broadcast the transaction
                    broadcastTransaction(network, signedTx, function(txid){
                        if(txid){
                            if(cb)
                                cb(txid);
                        } else {
                            cbError('Error while trying to broadcast send transaction', cb);
                        }
                    });
                } else {
                    cbError('Error while trying to sign send transaction',cb);
                }
            });
        } else {
            var msg = (o.error && o.error.message) ? o.error.message : 'Error while trying to create send transaction';
            cbError(msg, cb);
        }
    });
}

// Handle sending request to counterparty servers
function cpRequest(network, data, callback){
    var net  = (network=='testnet') ? 'testnet' : 'mainnet',
        info = WALLET_SERVER_INFO[net],
        url  = ((info.ssl) ? 'https' : 'http') + '://' + info.host + ':' + info.port + '/api/',
        auth = $.base64.btoa(info.user + ':' + info.pass);
    // Send request to server, process response
    $.ajax({
        type: "POST",
        url: url,
        data: JSON.stringify(data),
        dataType: 'json',
        crossDomain: false,
        headers: {
            'Authorization': 'Basic ' + auth, 
            'Content-Type': 'application/json; charset=UTF-8'
        },
        success: function(data){
            if(typeof callback === 'function')
                callback(data);
        }
    });
}

// Handle creating send transaction
function createSend(network, source, destination, asset, quantity, fee, callback){
    // console.log('network, source, destination, asset, quantity, fee, callback=',network, source, destination, asset, quantity, fee, callback);
    var data = {
       method: "create_send",
       params: {
            source: source,
            destination: destination,
            asset: asset,
            quantity: parseInt(quantity),
            allow_unconfirmed_inputs: true
        },
        jsonrpc: "2.0",
        id: 0
    };
    if(fee)
        data.params.fee = fee;
    cpRequest(network, data, function(o){
        if(typeof callback === 'function')
            callback(o);
    });
}

// Handle signing a transaction
function signTransaction(network, source, unsignedTx, callback){
    var net      = (network=='testnet') ? 'testnet' : 'mainnet',
        callback = (typeof callback === 'function') ? callback : false;
        privKey  = getPrivateKey(net, source)
        cwKey    = new CWPrivateKey(privKey);
    // update network (used in CWBitcore)
    NETWORK = bitcore.Networks[net];
    // Callback to processes response from signRawTransaction()
    var cb = function(x, signedTx){
        if(callback)
            callback(signedTx);
    }
    CWBitcore.signRawTransaction(unsignedTx, cwKey, cb);
}


// Broadcast a given transaction
function broadcastTransaction(network, tx, callback){
    var net = (network=='testnet') ? 'BTCTEST' : 'BTC',
        url = 'https://chain.so/api/v2/send_tx/' + net;
    $.ajax({
        type: "POST",
        url: url,
        data: { 
            tx_hex: tx 
        },
        dataType: 'json',
        success: function(o){
            var txid = (o && o.data && o.data.txid) ? o.data.txid : false;
            if(callback)
                callback(txid);
            if(txid)
                console.log('Broadcast transaction tx_hash=',txid);
        },
        error: function(){
            cbError('Error while trying to broadcast signed transaction',callback);
        }
    });
}



/* 
 * Dialog boxes 
 * https://nakupanda.github.io/bootstrap3-dialog/
 */

// Generic dialog box to handle simple messages
function dialogMessage( title, message, error, closable, callback ){
    var title = (error) ? '<i class="fa fa-lg fa-fw fa-exclamation-circle"></i> Error' : title; 
    BootstrapDialog.show({
        type: 'type-default',
        title: title,
        message: message,
        closable: (closable==false) ? false : true,
        buttons:[{
            label: 'Ok',
            icon: 'fa fa-lg fa-fw fa-thumbs-up',       
            cssClass: 'btn-success',
            hotkey: 13,
            action: function(msg){
                msg.close();
                if(typeof callback === 'function')
                    callback();
            }
        }]                        
    });
}

// 'About Wallet' dialog box
function dialogAbout(){
    BootstrapDialog.show({
        type: 'type-default',
        title: '<i class="fa fa-lg fa-fw fa-info-circle"></i> About your wallet',
        message: 'When you first visited this site, we created a bitcoin wallet for you to use.',
        buttons:[{
            label: 'Ok',
            icon: 'fa fa-lg fa-fw fa-thumbs-up',       
            cssClass: 'btn-success', 
            hotkey: 13,
            action: function(dialog){
                dialog.close();
            }
        }]
    });
}

// 'View Address' dialog box
function dialogAddress(){
    BootstrapDialog.show({
        type: 'type-default',
        cssClass: 'btc-wallet-address',
        title: '<i class="fa fa-lg fa-fw fa-qrcode"></i> View Wallet Address',
        message: function(dialog){
            var msg = $('<div class="center"></div>');
            addr = getWalletAddress();
            msg.qrcode({ text: addr });
            msg.append('<div style="margin-top:10px" class="btc-wallet-blackbox">' + addr + '</div>');
            return msg;
        },
        buttons:[{
            label: 'Ok',
            icon: 'fa fa-lg fa-fw fa-thumbs-up',       
            cssClass: 'btn-success', 
            hotkey: 13,
            action: function(dialog){
                dialog.close();
            }
        }]
    });
}


// 'Enter Passphrase' dialog box
function dialogChangeAddress(){
    BootstrapDialog.show({
        type: 'type-default',
        title: '<i class="fa fa-lg fa-fw fa-bitcoin"></i> Change Wallet Address',
        message: function(dialog){
            var msg = $('<div class="center"></div>');
            msg.append('<p>Please select an address from the dropdown below and click \'Ok\'</p>');
            msg.append('<select id="walletAddressList"></select>');
            return msg;
        },
        onshown: function(dialog){
            var sel = $('#walletAddressList'),
                cur = getWalletAddress();
            // Add first 10 wallet addresses to list
            for(var i=0;i<10;i++){
                var addr = getWalletAddress(i),
                    cfg  = { 
                        value: addr,
                        text : '#' + (i+1) + ' - ' + addr
                    };
                if(addr==cur)
                    cfg.selected = true;
                sel.append($('<option>', cfg));
            }
        },
        buttons:[{
            label: 'Ok',
            icon: 'fa fa-lg fa-fw fa-thumbs-up',       
            cssClass: 'btn-success', 
            hotkey: 13,
            action: function(dialog){
                var addr = $('#walletAddressList').val();
                setWalletAddress(addr);
                updateWalletBalances(addr,true);
                dialog.close();
                dialogMessage('<i class="fa fa-lg fa-fw fa-info-circle"></i> Wallet address changed', 'Your wallet address has been changed to ' + addr + '.');
            }
        }]
    });
}

// 'Create/Enter Password' dialog box
function dialogPassword( enable ){
    var title = (enable) ? 'Enter new wallet password' : 'Enter wallet password';
    BootstrapDialog.show({
        type: 'type-default',
        title: '<i class="fa fa-lg fa-fw fa-lock"></i> ' + title,
        cssClass: 'btc-wallet-password',
        closable: false,
        message: function(dialog){
            var msg = $('<div></div>');
            msg.append('<input name="wallet_password" type="password" class="form-control"  placeholder="Enter Password" autocomplete="off">');
            if(enable){
                msg.append('<input name="wallet_confirm_password" type="password" class="form-control"  placeholder="Confirm Password" autocomplete="off">');
                msg.append('<p class="justify no-bottom-margin">This password will be used to encrypt your wallet to give you an additional layer of protection against unauthorized use.</p>')
            }
            return msg;
        },
        buttons:[{
            label: 'Cancel',
            icon: 'fa fa-lg fa-fw fa-thumbs-down',       
            cssClass: 'btn-danger', 
            action: function(dialog){
                // Set flag to indicate user has skipped auth, and not prompt again until needed.
                if(!enable)
                    ss.setItem('skipWalletAuth',true)
                dialog.close();
                updateWalletOptions();
            }
        },{
            label: 'Ok',
            icon: 'fa fa-lg fa-fw fa-thumbs-up',       
            cssClass: 'btn-success', 
            hotkey: 13,
            action: function(dialog){
                var pass = $('[name="wallet_password"]').val(),
                    err  = false;
                // Validate that password meets minimum requirements (7 chars, 1 number)
                if(pass.length <=6){
                    err = 'Wallet password must be at least 7 characters long';
                } else if(!/\d/.test(pass)){
                    err = 'Wallet password must contain at least 1 number';
                } else if(enable){
                    var confirm = $('[name="wallet_confirm_password"]').val();
                    if(pass!=confirm)
                        err = 'Password and Confirmation password do not match!';
                }
                if(err){
                    dialogMessage(null, err, true);
                } else {
                    // Enable wallet encryption
                    if(enable){
                        encryptWallet(pass);
                        updateWalletOptions();
                        dialog.close();
                        dialogMessage('<i class="fa fa-lg fa-fw fa-lock"></i> Wallet password enabled', 'Your wallet password is now enabled and your wallet is encrypted.');
                    } else {
                        // Validate wallet password
                        if(isValidWalletPassword(pass)){
                            decryptWallet(pass);
                            dialog.close();
                            dialogMessage('<i class="fa fa-lg fa-fw fa-unlock"></i> Wallet unlocked', 'Your wallet is now unlocked and available for use');
                            updateWalletOptions();
                        } else {
                            dialogMessage(null, 'Invalid password', true);
                        }
                    }
                }
            }
        }]
    });    
}

// 'Lock Wallet' dialog box
function dialogLock(){
    lockWallet();
    updateWalletOptions();
    dialogMessage('<i class="fa fa-lg fa-fw fa-lock"></i> Wallet locked', 'Your wallet has been locked and is unavailable for use.');
}

// 'View Passphrase' dialog box
function dialogPassphrase(){
    BootstrapDialog.show({
        type: 'type-default',
        title: '<i class="fa fa-lg fa-fw fa-eye"></i> View Wallet Passphrase',
        message: function(dialog){
            var msg = $('<div></div>');
            msg.append('<div class="btc-wallet-passphrase">' + getWalletPassphrase() + '</div>');
            msg.append('<p>Your twelve-word wallet passphrase is shown in the black box above. Write it down and keep it safe. If you lose this passphrase, you will lose access to your wallet forever. If someone gets your passphrase, they gain access to your wallet. We do not store your passphrase and cannot recover it if lost.</p>');
            return msg;
        },
        buttons:[{
            label: 'Ok',
            icon: 'fa fa-lg fa-fw fa-thumbs-up',       
            cssClass: 'btn-success', 
            hotkey: 13,
            action: function(dialog){
                dialog.close();
            }
        }]
    });
}

// 'Reset Wallet' dialog box
function dialogReset(){
    BootstrapDialog.show({
        type: 'type-default',
        title: '<i class="fa fa-lg fa-fw fa-trash"></i> Reset Wallet',
        message: function(dialog){
            var msg  = $('<div></div>'),
                pass = getWalletPassphrase();
            if(pass){
                msg.append('<p>Write down your current passphrase before you reset! It is not recoverable!</p>');
                msg.append('<div class="btc-wallet-passphrase">' + getWalletPassphrase() + '</div>');
            }
            msg.append("<p>Click the 'Ok' button to reset your current wallet and generate a new one.<br/>Click the 'Enter Passphrase' button to enter the passphrase to an existing wallet.</p>");
            return msg;
        },
        buttons:[{
            label: 'Enter Passphrase',
            icon: 'fa fa-lg fa-fw fa-keyboard-o',       
            cssClass: 'btn-info', 
            action: function(dialog){
                dialog.close();
                dialogManualPassphrase();
            }
        },{
            label: 'Cancel',
            icon: 'fa fa-lg fa-fw fa-thumbs-down',       
            cssClass: 'btn-danger', 
            action: function(dialog){
                dialog.close();
            }
        },{
            label: 'Ok',
            icon: 'fa fa-lg fa-fw fa-thumbs-up',       
            cssClass: 'btn-success', 
            hotkey: 13,
            action: function(dialog){
                dialog.close();
                resetWallet();
                dialogMessage('<i class="fa fa-lg fa-fw fa-trash"></i> Wallet Reset Complete', 'Your wallet has been reset.', false, false, function(){
                    location.reload();
                });
            }
        }]
    });
}

// 'Enter Passphrase' dialog box
function dialogManualPassphrase(){
    BootstrapDialog.show({
        type: 'type-default',
        title: '<i class="fa fa-lg fa-fw fa-keyboard-o"></i> Enter Passphrase',
        message: function(dialog){
            var msg = $('<div class="center"></div>');
            msg.append('<p>Please enter your existing 12-word wallet passphrase and click \'Ok\'</p>');
            msg.append('<input type="text" class="btc-wallet-passphrase" id="manualPassphrase">');
            return msg;
        },
        onshown: function(dialog){
            $('#manualPassphrase').focus();
        },
        buttons:[{
            label: 'Cancel',
            icon: 'fa fa-lg fa-fw fa-thumbs-down',       
            cssClass: 'btn-danger', 
            action: function(dialog){
                dialog.close();
            }
        },{
            label: 'Ok',
            icon: 'fa fa-lg fa-fw fa-thumbs-up',       
            cssClass: 'btn-success', 
            hotkey: 13,
            action: function(dialog){
                var val = $('#manualPassphrase').val(),
                    arr = val.split(' '),
                    err = false;
                if(arr.length<12){
                    err='Passphrase must be 12 words in length';
                } else if(!isValidWalletPassphrase(val)){
                    err='Invalid Passphrase';
                }
                if(err){
                    dialogMessage(null, err, true);
                } else {
                    resetWallet();
                    createWallet(val);
                    dialog.close();
                    dialogMessage('<i class="fa fa-lg fa-fw fa-info-circle"></i> Wallet Updated!', 'Your wallet has been updated to use the passphrase you just entered.', false, false, function(){
                        location.reload();
                    });
                }
            }
        }]
    });
}


// 'Confirm Send' dialog box
function dialogSend(currency, amount, address, usd_amount){
    BootstrapDialog.show({
        type: 'type-default',
        title: '<i class="fa fa-lg fa-fw fa-paper-plane"></i> Confirm Send?',
        message: function(dialog){
            var msg = $('<div class="center"></div>');
            msg.append('<p>Are you sure you want to send <b>' + amount + ' ' + currency + '</b> ($' + usd_amount + ') to <i>' + address + '</i>?</p>');
            return msg;
        },
        buttons:[{
            label: 'No',
            icon: 'fa fa-lg fa-fw fa-thumbs-down',       
            cssClass: 'btn-danger', 
            action: function(dialog){
                dialog.close();
            }
        },{
            label: 'Yes',
            icon: 'fa fa-lg fa-fw fa-thumbs-up',       
            cssClass: 'btn-success', 
            hotkey: 13,
            action: function(dialog){
                dialog.close();
                cpSend('mainnet', getWalletAddress(), address, currency, amount, null, function(txid){
                    if(txid)
                        dialogMessage('<i class="fa fa-lg fa-fw fa-info-circle"></i> Payment Detected', 'Your payment has been detected and the feeds will be broadcast shortly.');
                });
            }
        }]
    });
}

