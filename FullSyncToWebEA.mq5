//+------------------------------------------------------------------+
//|                                                FullSyncToWebEA.mq5
//|   ส่งข้อมูล OHLC และ Order ไปยัง Web API อัตโนมัติ (MT5)
//|   และรับคำสั่งซื้อขายจากเว็บ (Two-way sync)
//+------------------------------------------------------------------+
#property copyright "GitHub Copilot"
#property version   "2.00"
#property strict

#include <Trade\Trade.mqh>
CTrade trade;

input string WebAPI_OHLC_URL = "http://127.0.0.1:4000/api/mt5-data";
input string WebAPI_ORDER_URL = "http://127.0.0.1:4000/api/mt5-order";
input string WebAPI_COMMAND_URL = "http://127.0.0.1:4000/api/mt5-command";
input int    maxBars = 720; // ส่งย้อนหลัง 720 แท่ง

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
  {
   EventSetTimer(10); // ส่งข้อมูลทุก 10 วินาที
   Print("FullSyncToWebEA Initialized.");
   return(INIT_SUCCEEDED);
  }
//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
  {
   EventKillTimer();
   Print("FullSyncToWebEA Deinitialized.");
  }
//+------------------------------------------------------------------+
//| Expert timer function                                            |
//+------------------------------------------------------------------+
void OnTimer()
  {
   SendOHLCData();
   CheckAndExecuteWebOrder();
  }
//+------------------------------------------------------------------+
//| ส่งข้อมูล OHLC ย้อนหลังไปยัง Web API                            |
//+------------------------------------------------------------------+
void SendOHLCData()
  {
   string symbol = Symbol();
   MqlRates rates[];
   ArraySetAsSeries(rates, true);
   int copied = CopyRates(symbol, PERIOD_H1, 0, maxBars, rates);
   if(copied <= 0) {
      Print("No bars copied for symbol: ", symbol);
      return;
   }

   string json = "[";
   for(int i = copied - 1; i >= 0; i--)
     {
      if(i != copied - 1) json += ",";
      json += "{";
      json += "\"symbol\":\"" + symbol + "\",";
      json += "\"time\":" + IntegerToString(rates[i].time) + ",";
      json += "\"open\":" + DoubleToString(rates[i].open, 5) + ",";
      json += "\"high\":" + DoubleToString(rates[i].high, 5) + ",";
      json += "\"low\":" + DoubleToString(rates[i].low, 5) + ",";
      json += "\"close\":" + DoubleToString(rates[i].close, 5) + ",";
      json += "\"tick_volume\":" + IntegerToString(rates[i].tick_volume);
      json += "}";
     }
   json += "]";

   uchar post[];
   StringToCharArray(json, post, 0, WHOLE_ARRAY, CP_UTF8);

   uchar result[];
   string headers = "Content-Type: application/json\r\n";
   int timeout = 5000;
   string result_headers = "";

   int res = WebRequest(
      "POST",
      WebAPI_OHLC_URL,
      headers,
      timeout,
      post,
      result,
      result_headers
   );

   if(res == -1) {
      Print("WebRequest OHLC failed. Error: ", GetLastError());
   } else {
      string response = "";
      if(ArraySize(result) > 0)
         response = CharArrayToString(result);
      Print(StringFormat("Sent %d bars. WebRequest OHLC success. Response: %s", copied, response));
   }
  }
//+------------------------------------------------------------------+
//| ส่งข้อมูล Order ทุกครั้งที่มีการเทรด (Buy/Sell/Close)            |
//+------------------------------------------------------------------+
void OnTradeTransaction(const MqlTradeTransaction &trans,
                        const MqlTradeRequest &request,
                        const MqlTradeResult &result)
  {
   if(trans.type == TRADE_TRANSACTION_DEAL_ADD)
     {
      ulong ticket = trans.deal;
      string symbol = trans.symbol;
      double volume = trans.volume;
      double price = trans.price;
      int type = trans.deal_type;
      int time = 0;
      string comment = "";

      // ส่งเฉพาะ Buy/Sell
      if(type == DEAL_TYPE_BUY || type == DEAL_TYPE_SELL)
        {
         string json = "{";
         json += "\"ticket\":" + IntegerToString((int)ticket) + ",";
         json += "\"symbol\":\"" + symbol + "\",";
         json += "\"type\":" + IntegerToString(type) + ",";
         json += "\"volume\":" + DoubleToString(volume, 2) + ",";
         json += "\"price\":" + DoubleToString(price, 5) + ",";
         json += "\"time\":" + IntegerToString(time) + ",";
         json += "\"comment\":\"" + comment + "\"";
         json += "}";

         uchar post[];
         StringToCharArray(json, post, 0, WHOLE_ARRAY, CP_UTF8);

         uchar resultArr[];
         string headers = "Content-Type: application/json\r\n";
         int timeout = 5000;
         string result_headers = "";

         int res = WebRequest(
            "POST",
            WebAPI_ORDER_URL,
            headers,
            timeout,
            post,
            resultArr,
            result_headers
         );

         if(res == -1)
           {
            Print("[EA] WebRequest Order failed. Error: ", GetLastError());
           }
         else
           {
            string response = "";
            if(ArraySize(resultArr) > 0)
               response = CharArrayToString(resultArr);
            Print(StringFormat("[EA] Sent order ticket %d. WebRequest Order success. Response: %s", ticket, response));
           }
        }
     }
  }
//+------------------------------------------------------------------+
//| ดึงคำสั่งจาก backend และ execute order จริง                     |
//+------------------------------------------------------------------+
void CheckAndExecuteWebOrder()
  {
   string url = WebAPI_COMMAND_URL + "?symbol=" + Symbol();
   uchar result[];
   string headers = "Content-Type: application/json\r\n";
   int timeout = 5000;
   string result_headers = "";
   int res = WebRequest("GET", url, headers, timeout, result, result_headers);
   if(res == 200 && ArraySize(result) > 0)
     {
      string response = CharArrayToString(result);
      // ตัวอย่าง response: {"command":{"symbol":"EURUSD","action":"buy","volume":0.05,"price":0,"createdAt":...}}
      int cmdPos = StringFind(response, "\"command\":");
      if(cmdPos != -1 && StringFind(response, "null") == -1)
        {
         string action = "";
         double volume = 0;
         int actionPos = StringFind(response, "\"action\":\"");
         if(actionPos != -1) {
           int start = actionPos + 10;
           int end = StringFind(response, "\"", start);
           action = StringSubstr(response, start, end - start);
         }
         int volPos = StringFind(response, "\"volume\":");
         if(volPos != -1) {
           int start = volPos + 9;
           int end = StringFind(response, ",", start);
           if(end == -1) end = StringLen(response);
           volume = StringToDouble(StringSubstr(response, start, end - start));
         }
         // Execute order
         if(action == "buy" && volume > 0) {
           trade.Buy(volume, Symbol());
         } else if(action == "sell" && volume > 0) {
           trade.Sell(volume, Symbol());
         }
        }
     }
  }
//+------------------------------------------------------------------+
