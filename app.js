var http = require( 'http' ); // HTTPモジュール読み込み
var socketio = require( 'socket.io' ); // Socket.IOモジュール読み込み
var fs = require( 'fs' ); // ファイル入出力モジュール読み込み
var pg = require( 'pg' );
var Tesseract = require('tesseract.js');
var kuromoji = require('kuromoji');

//ポート固定でHTTPサーバーを立てる
var server = http.createServer( function( req, res ) {
  //もしURLにファイル名がないならばindex.htmlに飛ばすように
  if(req.url == "/")
    req.url = "/index.html";
  //URLでリクエストされたページをread
  fs.readFile(__dirname + req.url, 'utf-8', function(err, data){
  //もし見つからなかったら404を返す
    if(err){　//err=trueならNot Foundを返します。
      res.writeHead(404, {'Content-Type': 'text/plain'});
      res.write("Not Found");
      return res.end();　
    }
    //見つかったら表示
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.write(data);
    res.end();
  });
});

server.listen(process.env.PORT || 3000)

var io = socketio.listen(server);
var connect_db = "postgres://ayeypgykvzakah:_17U8W-o_m4Q2fXT-XxulAbxIN@ec2-54-235-254-199.compute-1.amazonaws.com:5432/d5g401imvq4lac";

io.sockets.on('connection',function(socket){
  console.log("connect server");

  socket.on('encode',function( data ) {
    pg.connect(connect_db,function(err, client){
      console.log("connect db");
      var pcid = "select id from notes";

      client.query(pcid, function(err, max)
      {
        var id_max = max.rows.length + 1;
        var pcin = "insert into notes(id,pdf,cource) values ("+id_max+",'"+data.code+"',"+data.cource+")";
        client.query(pcin);
        io.sockets.emit('encode_back', 1);
        console.log(data);
      });
    });
  });

  socket.on('list',function(){
    pg.connect(connect_db,function(err, client){
      console.log("connect db");
      var imax = "select id from notes;"
      client.query(imax,function(err, max){
        console.log(max.rows.length);
        var i;
        var w = 0;
        var q = max.rows.length;
        var array = new Array();
        for(i = q; i > q - 8; i = i - 1){
          var getdata = "select id, pdf from notes where id = "+i+";"
          client.query(getdata,function(err, note){
            array[w] = new Object();
            array[w].code = note.rows[0].pdf;
            array[w].id = note.rows[0].id;
            array[w].cource = note.rows[0].cource;
            console.log(array[w].id);
            w = w + 1;
          });
        };
        io.sockets.emit('list_back',array);
        console.log("success");
        console.log(array[1].cource);
      });
    });
  });

  socket.on("convert_img", function(note_img){
    //画像の文字化
    Tesseract.recognize(note_img, {lang:"jpn"}).then(function(result){
      console.log("finish ocr");
      socket.emit("convert_text", result.html);
    });
  });

  socket.on("keitaiso", function(text){
    // この builder が辞書やら何やらをみて、形態素解析機を造ってくれるオブジェクトです。
    var builder = kuromoji.builder({
      // ここで辞書があるパスを指定します。今回は kuromoji.js 標準の辞書があるディレクトリを指定
      dicPath: 'node_modules/kuromoji/dict/'
    });
    // 形態素解析機を作るメソッド
    builder.build(function(err, tokenizer) {
      // 辞書がなかったりするとここでエラーになります
      if(err) { throw err; }
      // tokenizer.tokenize に文字列を渡すと、その文を形態素解析してくれます。
      var tokens = tokenizer.tokenize(text);
      var list = [];
      for(var i=0; i<tokens.length; i++){
        if(tokens[i]['pos'] == "名詞")
          list.push(tokens[i]['surface_form']);
      }
      console.log(list);
      socket.emit("con_keitaiso", list);
    });
  });

});



