var React = require("react");
var ReactDOM = require("react-dom");
var xhr = require("xhr");
var io = require("socket.io-client");

var CoincapBadge = (function(){
  var onLoadCoin = [];
  var coins = {};
  function loadCoin(coin, callback){
    if (coins[coin])
      callback(coin);
    else {
      onLoadCoin.push([coin, callback]);
      if (onLoadCoin.length === 1) {
        xhr({uri:"https://coincap.io/front"},
          function(err, res, body){
            var front = JSON.parse(body);
            for (var i=0, l=front.length; i<l; ++i)
              coins[front[i].short] = front[i];
            for (var i=0, l=onLoadCoin.length; i<l; ++i)
              onLoadCoin[i][1](coins[onLoadCoin[i][0]]);
          });
      };
    };
  };

  var socket;
  var onTradeCallbacks = {};
  function onTrade(coin, callback){
    onTradeCallbacks[coin] = callback;
    if (!socket){
      socket = io.connect('http://socket.coincap.io');
      socket.on('trades', function (msg) {
        var coin = msg.message.msg;
        if (onTradeCallbacks[coin.short])
          onTradeCallbacks[coin.short](coin);
      }.bind(this));
    };
  };

  var MicroChart = React.createClass({
    render: function(){
      var w = this.props.w;
      var h = this.props.h;
      var lines = this.props.charts.map(function(chart, k){
        var f = chart.f;
        var l = 64;
        var points = "";
        for (var i=0; i<l; ++i){
          var x = i/l;
          var y = f(x);
          points += (x*w)+","+(y*h)+" ";
        }
        return <polyline
          key={k}
          points={points}
          style={{"stroke" : chart.color, "fill": "none"}}/>
      });
      return <svg width={w} height={h}>
        {lines}
      </svg>
    }
  })

  var Badge = React.createClass({
    getInitialState: function(){
      return {
        charts: [
          {color: "#FF5555", f: function(x){ return (Math.sin(x*50)+1)/2; }}
        ],
        volume24h: 0,
        marketCap: 0,
        price: 0,
        coinIconUrl: "https://coincap.io/images/coins/missing.png"
      }
    },
    componentDidMount: function(){
      var coin = this.props.coin||"BTC";
      var loadCoinData = function(data){
        var locallyHostedLogo = {
          BTC: true,
          ETH: true};
        if (data.short === this.props.coin){
          this.state.volume24h = Number(data.usdVolume);
          this.state.price = Number(data.price);
          this.state.marketCap = Number(data.mktcap);
          this.state.coinIconUrl
            = locallyHostedLogo[data.short]
            ? "images/"+data.short+".png"
            : "https://coincap.io/images/coins/"+data.long+".png";
          this.forceUpdate();
        };
      }.bind(this);
      loadCoin(coin, loadCoinData);
      onTrade(coin, loadCoinData);
      xhr({uri:"https://coincap.io/history/365day/"+coin}, 
        function(err, res, body){
          function pointsToFunction(points, width){
            var minX = points[0][0];
            var maxX = points[points.length-1][0];
            var minY = Infinity;
            var maxY = 0;
            for (var i=0, l=points.length; i<l; ++i){
              minY = Math.min(minY, points[i][1]);
              maxY = Math.max(maxY, points[i][1]);
            };
            var ys = [];
            for (var i=0, l=points.length; i<l; ++i){
              var p = points[i];
              var x = (p[0]-minX)/(maxX-minX);
              var y = (p[1]-minY)/(maxY-minY);
              ys[Math.floor(x*width)] = y;
            };
            return function(x){
              return ys[Math.floor(x*width)];
            };
          };
          var charts = JSON.parse(body);
          this.state.charts = [
            {f: pointsToFunction(charts.market_cap, 90), color: "#55FF55"},
            {f: pointsToFunction(charts.price, 90), color: "#5555FF"}];
          this.forceUpdate();
        }.bind(this));
    },
    render: function(){
      return <div className="coincap-badge">

        <div className="coincap-badge-left">
          <img className="coincap-badge-icon" src={this.state.coinIconUrl}/>
        </div>

        <div className="coincap-badge-right">

          <div className="coincap-badge-up">
            <div className="coincap-badge-info-container">
              <div className="coincap-badge-info-title">
                24h Volume
              </div>
              <div className="coincap-badge-info-value">
                ${this.state.volume24h.toLocaleString()}
              </div>
            </div>

            <div className="coincap-badge-info-container">
              <div className="coincap-badge-info-title">
                Market Cap
              </div>
              <div className="coincap-badge-info-value">
                ${Math.floor(this.state.marketCap).toLocaleString()}
              </div>
            </div>
          </div>

          <div className="coincap-badge-down">
            <div className="coincap-badge-price">
                ${this.state.price.toFixed(2)}
            </div>

            <div className="coincap-badge-chart">
              <MicroChart w={80} h={20} charts={this.state.charts}/>
            </div>
          </div>

        </div>
      </div>
    }
  });

  return Badge;
})();


window.onload = function(){
  ReactDOM.render(
    <div>{
      ["BTC", "ETH", "STEEM", "XRP",
       "LTC", "EMC", "XEM", "DASH",
       "MAID", "LSK", "DOGE", "NXT",
       "XMR", "WAVES", "AMP", "DGD"].map(
      function(coin){
        return <div style={{"margin": "4px", "display": "inline-block"}}>
          <CoincapBadge coin={coin}/>
        </div>
      })}
    </div>,
    document.getElementById("app"));
}
console.log("hi");
