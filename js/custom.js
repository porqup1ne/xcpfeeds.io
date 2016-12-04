/*
 * Custom Javascript
 */

// API_HOST = 'https://xcpfeeds.dev';
API_HOST = 'https://xcpfeeds.io';

// Setup some short aliases
var ls = localStorage,
    ss = sessionStorage;

$( document ).ready(function(){
    var b = $('body'),
        c = $('#pageContent'),
        t = ls.getItem('theme') || 'theme-sapphire-blue';
        p = ls.getItem('lastPage') || 'sports';
    // Load preferred theme
    b.addClass(t);
    if(c){
        $("#theme-selector option").each(function(i){
            var el = $(this);
            if(el.val()==t)
                el.attr('selected', true);
        });
        $('#theme-selector').colorselector({
            callback: function (value, color, title){
                $("#theme-selector option").each(function(){
                    b.removeClass($(this).val());
                });
                b.addClass(value);
                ls.setItem('theme',value);
            }
        });
        // Load sports event if we are on event page
        // if(l[0]=='event'){
        //     load_page('sports');
        //     load_sport_event(e);
        // } else {
        //     // Load the last visible page 
        //     load_page(p);        
        // }
        load_page(p);        

        // Setup listeners on main menu to load pages when items are clicked
        $('#brandLogo').click(function(){  load_page('sports'); })
        $('#pageHome').click(function(){   load_page('home'); })
        $('#pageSports').click(function(){ load_page('sports'); })
        $('#pageAbout').click(function(){  load_page('about'); })
        $('#pageFAQ').click(function(){    load_page('faq'); })
    }
});

// Collapsible panels
$(document).on('click', '.panel-heading.collapsible', function(e){
    var $this = $(this),
        panel = $this.parents('.panel').find('.panel-body'),
        icon  = $this.find('i');
    if(!$this.hasClass('panel-collapsed')){
        panel.removeClass('min-height-220').slideUp();
        $this.addClass('panel-collapsed');
        icon.removeClass('glyphicon-chevron-up').addClass('glyphicon-chevron-down');
    } else {
        panel.slideDown();
        if(panel.hasClass('min-220'))
            panel.addClass('min-height-220');
        $this.removeClass('panel-collapsed');
        icon.removeClass('glyphicon-chevron-down').addClass('glyphicon-chevron-up');
    }
});


ODD_TYPES = {
     2: 'Game',
    14: '1st Half',
    15: '2nd Half',
    16: '1st Quarter',
    17: '2nd Quarter',
    18: '1st Period',
    19: '2nd Period',
    20: '3nd Period',
}

CATEGORIES = {
     1: 'Baseball',
     2: 'Basketball',
     3: 'Cricket',
     4: 'College',
     5: 'Football',
     6: 'Hockey',
     7: 'Horse Racing',
     8: 'MMA',
     9: 'Soccer',
    10: 'Tennis'
}

SPORTS = {
    0: 'MLB - Major League Baseball',
    1: 'NBA - National Basketball Association',
    2: 'NCAAB - National Collegiate Athletic Association Basketball',
    3: 'NCAAF - National Collegiate Athletic Association Football',
    4: 'NFL -  National Football League',
    5: 'NHL -  National Hockey League',
    6: 'NFL -  National Football League',
    7: 'Soccer',
    8: 'WNBA -  Womens National Basketball Association ',
    9: 'Tennis',
    11: 'MMA - Mixed Martial Arts',
    12: 'cricket',
    13: 'Horse Racing'
}


function load_page( page ){
    $('#pageContent').load('html/' + page + '.html');
    ls.setItem('lastPage',page);
}


function load_sport( category, subcategory, type ){
    var cat  = (category) ? category : 1,
        sub  = (subcategory>=0) ? subcategory : '',
        type = (type) ? type : ls.getItem('eventType') || 'upcoming';
    // Hide event info, show matches info
    $('#sportsMatches').show();
    $('#sportsEvent').hide();
    // Save to localStorage so we can restore on refresh/reload
    ls.setItem('lastCategory',cat);
    if(sub>=0){
        ls.setItem('lastSubcategory',sub);
    } else {
        ls.removeItem('lastSubcategory');
    }
    ls.setItem('eventType',type);
    // Load matches
    get_matches(cat, sub, type);
    var title = (sub && sub>=0) ? SPORTS[sub] : CATEGORIES[cat];
    $('#sportName').html(title);
}


function load_sport_event( event_id ){
    ss.setItem('eventId', event_id);
    $('#sportsMatches').hide();
    $('#sportsEvent').load('html/sports_event.html').show();
    // load_page('event');
}


function update_event_type( type ){
    var cat  = ls.getItem('lastCategory') || 1,
        sub  = ls.getItem('lastSubcategory') || '';
    ls.setItem('eventType',type); 
    load_sport(cat, sub, type);
}


function update_odds_format( format ){
    var cat  = ls.getItem('lastCategory') || 1,
        sub  = ls.getItem('lastSubcategory') || '',
        type = ls.getItem('eventType') || 'upcoming';
    ls.setItem('oddsFormat',format);
    load_sport(cat, sub, type);
}


function get_html(a,b){
    return '<div class="border-bottom">'+a+'</div><div>'+b+'</div>';
}


function get_html2(a,b,c,d){
    var txt1 = '<div class="half">'+a+'</div><div class="half">'+b+'</div>',
        txt2 = '<div class="half">'+c+'</div><div class="half">'+d+'</div>';
    return get_html(txt1, txt2)
}


function get_html3(a,b,c,d,e,f){
    var txt1 = '<div class="third">'+a+'</div><div class="third">'+b+'</div><div class="third">'+c+'</div>',
        txt2 = '<div class="third">'+d+'</div><div class="third">'+e+'</div><div class="third">'+f+'</div>';
    return get_html(txt1, txt2)
}


function get_html4(a,b,c){
    var txt1 = '<div class="half">'+b+'</div><div class="half">'+c+'</div>';
    return get_html(a,txt1);
}


function american_to_decimal(num){
    if(/^\-/.test(num)){
        // negative number (100/moneyline) + 1
        num = (100/Math.abs(num)) + 1;
    } else {
        // positive number (moneyline/100) + 1        
        num = (Math.abs(num)/100) + 1;
    }
    num = Math.floor(num * 100) / 100
    // return num;
    return numeral(num).format('0.00');
}


function number_format(x){
    if(!/^-/.test(x))
        x = '+' + x;
    return x;
}


function get_val(val, odds){
    if(val==0||val==null)
        val = ' ';
    else if(odds=='decimal')
        val = american_to_decimal(val); // decimal odds
    else
        val = number_format(val); // american odds
    return val;
}


function get_matches( category, subcategory, type ){
    var url = API_HOST + "/api/get_matches?catid="  + category + '&subid=' + subcategory + '&type=' + type;
    // Convert Moneyline to Runline for baseball
    if(category==1)
        $('th.spread').html('Run Line');
    if($.fn.DataTable.isDataTable( '#matches' )){
        $('#matches').dataTable().api().ajax.url( url ).load();
    } else {
        $('#matches').dataTable({
            "dom":'<"#matches-info.hidden"i><"search-results"t><"search-results-footer clearfix"lp>',
            "searching": false,
            "ordering": false,
            "processing": true,            
            "aLengthMenu": [10, 25, 50, 100, 200, 250],
            "iDisplayLength": 10,
            "autoWidth": false,            
            "oLanguage": {
                "sLengthMenu": "_MENU_ events per page",
                "sProcessing": "Loading...",
                "sInfo": "Showing _START_ - _END_ of _TOTAL_ events"
            },
            "columns":[
                { "className": "timestamp" },
                { "className": "splitrow" },
                { "className": "splitrow hidden-xs center moneyline" },
                { "className": "splitrow hidden-xs center spread" },
                { "className": "splitrow hidden-xs center overunder" },
                { "className": "splitrow hidden-xs center overunder" },
                { "className": "view-btn" }
            ],
            "serverSide": true,
            "ajax": url,
            "fnDrawCallback": function( oSettings ){
                $('#search-results-info').html($('#matches-info').html());
            },            
            "createdRow": function(row, data, idx){
                var odds_format           = ls.getItem('oddsFormat') || 'american',
                    m                     = moment(data[0] + ' +0000', 'YYYY-MM-DD HH:mm:ss Z'),
                    t                     = m.format('MM/DD') + ' ' + m.format('hh:mm A'),
                    home_team             = data[1],
                    away_team             = data[2],
                    moneyline_home        = data[7],
                    moneyline_away        = data[8],
                    pointspread_home      = (data[4]==null||data[4]==0||data[3]==null) ? ' ' : number_format(data[3]),
                    pointspread_away      = (data[6]==null||data[6]==0||data[5]==null) ? ' ' : number_format(data[5]),
                    pointspread_home_line = data[4],
                    pointspread_away_line = data[6],
                    over_line             = data[10],
                    under_line            = data[11],
                    over                  = (data[9]==0||data[9]==null) ? '' : 'Over '  + data[9],
                    under                 = (data[9]==0||data[9]==null) ? '' : 'Under ' + data[9];
                $('td', row).eq(0).html(t + '<br><span data-livestamp=' + m.unix() + '></span>' );
                $('td', row).eq(1).html(get_html(home_team,away_team));
                $('td', row).eq(2).html(get_html(get_val(moneyline_home,odds_format),get_val(moneyline_away,odds_format)));
                $('td', row).eq(3).html(get_html2(pointspread_home, get_val(pointspread_home_line,odds_format),
                                                 pointspread_away, get_val(pointspread_away_line,odds_format)));
                $('td', row).eq(4).html(get_html(over,  get_val(over_line,odds_format)));
                $('td', row).eq(5).html(get_html(under, get_val(under_line,odds_format)));
                $('td', row).eq(6).html('<a href="#" onClick="load_sport_event(\'' + data[12] + '\')" class="btn btn-block btn-success"><i class="fa fa-arrow-right"></i></a>');
                // Old format which displayed both American/Decimal formats
                // $('td', row).eq(2).html(get_html2(get_val(moneyline_home,'decimal'), get_val(moneyline_home),
                //                                  get_val(moneyline_away,'decimal'), get_val(moneyline_away)));
                // $('td', row).eq(3).html(get_html3(pointspread_home, get_val(pointspread_home_line,'decimal'), get_val(pointspread_home_line),
                //                                  pointspread_away, get_val(pointspread_away_line,'decimal'), get_val(pointspread_away_line)));
                // $('td', row).eq(4).html(get_html4(over,  get_val(over_line,'decimal'),  get_val(over_line)));
                // $('td', row).eq(5).html(get_html4(under, get_val(under_line,'decimal'), get_val(under_line)));
                // $('td', row).eq(6).html('<a href="#" onClick="load_sport_event(\'' + data[12] + '\')" class="btn btn-block btn-success"><i class="fa fa-arrow-right"></i></a>');
            }
        });
    }
} 


function get_odds( type ){
    var type = (typeof type === 'number') ? type : 2,
        url  = API_HOST + "/api/get_odds/" + EVENT_ID + '?type=' + type;
    if($.fn.DataTable.isDataTable( '#odds' )){
        $('#odds').dataTable().api().ajax.url( url ).load();
    } else {
        $('#odds').dataTable({
            dom:'<"search-results"t>',
            searching: false,
            ordering: false,
            processing: true,            
            aLengthMenu: [10, 25, 50, 100, 200, 250],
            iDisplayLength: 20,
            autoWidth: false,            
            language: {
                emptyTable: "No odds data available"
            },
            columns:[
                { "className": "timestamp" },
                { "className": "splitrow" },
                { "className": "splitrow center moneyline" },
                { "className": "splitrow center spread" },
                { "className": "splitrow center overunder" },
                { "className": "splitrow center overunder" },
            ],
            serverSide: true,
            ajax: url,
            fnDrawCallback: function( oSettings ){
                var total = oSettings._iRecordsTotal.toFixed(2).replace(/./g, function(c, i, a) {
                    return i && c !== "." && !((a.length - i) % 3) ? ',' + c : c;
                });
                total = total.replace('.00','');
                // $('#total-records').html(total);
            },            
            createdRow: function(row, data, idx){
                var odds_format           = ls.getItem('oddsFormat') || 'american',
                    m                     = moment(data[0] + ' +0000', 'YYYY-MM-DD HH:mm:ss Z'),
                    home_team             = data[2],
                    away_team             = data[3],
                    moneyline_home        = data[8],
                    moneyline_away        = data[9],
                    pointspread_home      = (data[5]==null||data[5]==0||data[4]==null) ? ' ' : number_format(data[4]),
                    pointspread_away      = (data[7]==null||data[7]==0||data[6]==null) ? ' ' : number_format(data[6]),
                    pointspread_home_line = data[5],
                    pointspread_away_line = data[7],
                    over_line             = data[11],
                    under_line            = data[12],
                    over                  = (data[10]==0||data[10]==null) ? '' : 'Over '  + data[10],
                    under                 = (data[10]==0||data[10]==null) ? '' : 'Under ' + data[10];
                $('td', row).eq(0).html(data[1] + '<br><span data-livestamp=' + m.unix() + '></span>' );
                $('td', row).eq(1).html(get_html(home_team,away_team));
                $('td', row).eq(2).html(get_html(get_val(moneyline_home,odds_format), get_val(moneyline_away,odds_format)));
                $('td', row).eq(3).html(get_html2(pointspread_home, get_val(pointspread_home_line,odds_format),
                                                 pointspread_away, get_val(pointspread_away_line,odds_format)));
                $('td', row).eq(4).html(get_html(over,  get_val(over_line,odds_format)));
                $('td', row).eq(5).html(get_html(under, get_val(under_line,odds_format)));
                // $('td', row).eq(2).html(get_html2(get_val(moneyline_home,'decimal'), get_val(moneyline_home),
                //                              get_val(moneyline_away,'decimal'), get_val(moneyline_away)));
                // $('td', row).eq(3).html(get_html3(pointspread_home, get_val(pointspread_home_line,'decimal'), get_val(pointspread_home_line),
                //                              pointspread_away, get_val(pointspread_away_line,'decimal'), get_val(pointspread_away_line)));
                // $('td', row).eq(4).html(get_html4(over,  get_val(over_line,'decimal'),  get_val(over_line)));
                // $('td', row).eq(5).html(get_html4(under, get_val(under_line,'decimal'), get_val(under_line)));
            }
        }); 
    }   
}


function get_event(){
    var url = API_HOST + "/api/get_event/" + EVENT_ID;
    $.getJSON( url, function( o ){
        if(o.success){
            var m = moment(o.match_time + ' +0000', 'YYYY-MM-DD HH:mm:ss Z'),
                t = m.format('MM/DD/YYYY') + ' ' + m.format('hh:mm A');
            $('#home_team').html(o.home);
            $('#away_team').html(o.away);
            $('#sport').html(o.sport);
            $('#league').html(o.league);
            $('#region').html(o.region);
            $('#description').html(o.description);
            $('#match_time').html(t + ' (<span data-livestamp=' + m.unix() + '></span>)' );
        }
    });    
}


function get_feeds( type ){
    var url = API_HOST + "/api/get_feeds/" + EVENT_ID  + "?type=" + type;
    $.getJSON( url, function( o ){
        $('#feedMoneyline').html(get_feed_button(o.moneyline));
        $('#feedSpread').html(get_feed_button(o.spread));
        $('#feedOverUnder').html(get_feed_button(o.overunder));
        $('#feedBroadcastNow').hide();
        $('#feedBroadcastExpired').hide();
        $('#feedBroadcastComplete').hide();
        $('#feedBroadcastNone').hide();
        var e = moment(o.expires + ' +0000', 'YYYY-MM-DD HH:mm:ss Z'),
            n = moment();
        if(o.moneyline.length==5||o.spread.length==5||o.overunder.length==5){
            $('#feedBroadcastComplete').show();
        } else if(n.unix() >= e.unix()){
            $('#feedBroadcastExpires').html('<span data-livestamp=' + e.unix() + '></span>')
            $('#feedBroadcastExpired').show();
        } else if(o.moneyline==true||o.spread==true||o.overunder==true) {
            $('#feedBroadcastNow').show();
        } else {
            $('#feedBroadcastNone').show();
        }

    });    

}


function get_feed_button( val ){
    var val = (typeof val=== 'undefined') ? false : val,
        cls = '',
        txt = '';
    if(val==false){
        cls = 'btn-danger';
        txt = 'Not Available';
    } else if(val==true){
        cls = 'btn-warning';
        txt = 'Not Broadcast';
    } else if(val=='P'){
        cls = 'btn-info';
        txt = 'Pending';
    } else {
        cls = 'btn-success';
        txt = 'View';
    }
    var btn = '<span class="pull-right btn btn-xs ' + cls + '">' + txt + '</span>';
    if(txt=='View')
        btn = '<a href="'+ API_HOST + '/feed/' + val + '" target="_blank">' + btn + '</a>';
    return btn;

}


function get_results( type ){
    var url = API_HOST + "/api/get_results/" + EVENT_ID  + "?type=" + type;
    $.getJSON( url, function( o ){
        if(o.success){
            var m = moment(o.updated + ' +0000', 'YYYY-MM-DD HH:mm:ss Z');
            $('#home_score').html(o.home);
            $('#away_score').html(o.away);
            $('#status').html(o.status);
            $('#results_updated').html('<span data-livestamp=' + m.unix() + '></span>');
        } else {
            $('#home_score').html('-');
            $('#away_score').html('-');
            $('#status').html('-');
            $('#results_updated').html('-');
        }
    });    
}


function update_odds_info( type ){
    ls.setItem('lastOdds',type);
    $('.odds-type-description').html(ODD_TYPES[type]);
    get_odds(type);
    get_results(type);
    get_feeds(type);
}

/* 
 * Dialog boxes 
 * https://nakupanda.github.io/bootstrap3-dialog/
 */

function dialogBroadcast(){
    var type = ls.getItem('lastOdds',type) || 2,
        url  = API_HOST + "/api/broadcast/" + EVENT_ID  + "?type=" + type,
        w    = getWallet(),
        btns = [{
            label: 'Cancel',
            icon: 'fa fa-lg fa-fw fa-thumbs-down',       
            cssClass: 'btn-danger', 
            hotkey: 13,
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
            }
        }];
    // Get feed payment address/amount
    $.getJSON( url, function( o ){
        if(o.success){
            // Only display the 'Pay Now' button if we have an unlocked wallet
            if(w){
                btns.splice(0,0,{
                    label: 'Pay Now',
                    icon: 'fa fa-lg fa-fw fa-bitcoin',       
                    cssClass: 'btn-info', 
                    hotkey: 13,
                    action: function(dialog){
                        dialog.close();
                        // Confirm wallet send
                        dialogSend('BTC', o.btc_amount, o.address, o.usd_amount);
                    }
                });
            } else {
                // Display 'Unlock Wallet' button if wallet is locked
                btns.splice(0,0,{
                    label: 'Unlock Wallet',
                    icon: 'fa fa-lg fa-fw fa-unlock',       
                    cssClass: 'btn-info', 
                    hotkey: 13,
                    action: function(dialog){
                        dialog.close();
                        dialogPassword();
                    }
                });        
            }
            BootstrapDialog.show({
                type: 'type-default',
                title: '<i class="fa fa-lg fa-fw fa-bullhorn"></i> Broadcast Now - ' + ODD_TYPES[type] + ' Feeds',
                message: function(dialog){
                    var msg = $('<div class="center"></div>');
                    msg.append('<div style="margin-bottom:10px">To broadcast the <b><i>' + ODD_TYPES[type].toLowerCase() + ' feeds</i></b> for this event<br>Send <b>' + o.btc_amount + ' BTC</b> ($' + o.usd_amount + ') to ' + o.address + '</div>');
                    msg.qrcode({ text: 'bitcoin:' + o.address + '?amount=' + o.btc_amount });
                    msg.append('<div style="margin-top:10px">Once payment is detected and confirmed, the <b><i>' + ODD_TYPES[type].toLowerCase() + ' feeds</i></b> will be broadcast.</div>');
                    return msg;
                },
                buttons: btns
            });
        } else {
            dialogMessage( null, o.error, true, true);
        }
    });
}

