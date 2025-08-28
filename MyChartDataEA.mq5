//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int startIndex = 0; // ตำแหน่งเริ่มต้นของ window
int windowSize = 20;
int maxBars = 720;

int OnInit()
  {
   EventSetTimer(10); // ส่งข้อมูลทุก 10 วินาที
   Print("EA Initialized. Waiting for timer...");
   startIndex = 0;
   return(INIT_SUCCEEDED);
  }
//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
  {
   EventKillTimer();
   Print("EA Deinitialized.");
  }
//+------------------------------------------------------------------+
//| Expert timer function                                            |
//+------------------------------------------------------------------+
void OnTimer()
  {
   SendOHLCData();
  }
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

   // ส่งข้อมูลสะสม (append) ทุก window
   int endIndex = startIndex + windowSize;
   if(endIndex > maxBars) endIndex = maxBars;

   string json = "[";
   for(int i = endIndex - 1; i >= 0; i--)
     {
      if(i != endIndex - 1) json += ",";
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
   string url = "http://127.0.0.1:4000/api/mt5-data";
   string result_headers = "";

   int res = WebRequest(
      "POST",
      url,
      headers,
      timeout,
      post,
      result,
      result_headers
   );

   if(res == -1) {
      Print("WebRequest failed. Error: ", GetLastError());
   } else {
      string response = "";
      if(ArraySize(result) > 0)
         response = CharArrayToString(result);
      Print(StringFormat("Sent bars %d-%d. WebRequest success. Response: %s", startIndex, endIndex-1, response));
   }

   // ขยับ window
   startIndex += windowSize;
   if(startIndex >= maxBars) startIndex = 0; // วนใหม่
  }
//+------------------------------------------------------------------+
