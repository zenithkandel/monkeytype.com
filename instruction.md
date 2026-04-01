in this typing game named monkeytype, when a user conducts their typing test, it it sent to the server as a POST request to the api.monkeytype.com/result API. the request is held from the client side and contains the following parameters:
the headers contain the following things

```
Request URL
https://api.monkeytype.com/results
Request Method
POST
Status Code
200 OK
Remote Address
172.67.69.61:443
Referrer Policy
strict-origin-when-cross-origin
access-control-allow-methods
GET,HEAD,PUT,PATCH,POST,DELETE
access-control-allow-origin
*
access-control-expose-headers
X-Compatibility-Check
cf-cache-status
DYNAMIC
cf-ray
9e5419f8a94fc6af-KTM
content-encoding
br
content-security-policy
default-src 'self';base-uri 'self';block-all-mixed-content;font-src 'self' https: data:;frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests
content-type
application/json; charset=utf-8
date
Wed, 01 Apr 2026 02:18:08 GMT
etag
W/"V4-fd-GMJU9kfJpAGUrBrav3MB9vc3nmY"
expect-ct
max-age=0
nel
{"report_to":"cf-nel","success_fraction":0.0,"max_age":604800}
referrer-policy
no-referrer
report-to
{"group":"cf-nel","max_age":604800,"endpoints":[{"url":"https://a.nel.cloudflare.com/report/v4?s=j09ShGF8xVNz9Jfl7VF7hI%2FOGFb%2F71tRN%2FVtDBbAc%2FGwzXnlsAVj5S6I569ctUzL5iaC2G0HK2zsAwutoz6VKVqPcYyu6dkQhjASLSkaPPNmHbS%2BN9%2FpN9vTJh8JktkZk2j3LQ%3D%3D"}]}
server
cloudflare
strict-transport-security
max-age=15552000; includeSubDomains
x-compatibility-check
4
x-content-type-options
nosniff
x-dns-prefetch-control
off
x-download-options
noopen
x-frame-options
SAMEORIGIN
x-permitted-cross-domain-policies
none
x-ratelimit-limit
300
x-ratelimit-remaining
299
x-ratelimit-reset
1775013489
x-xss-protection
0
:authority
api.monkeytype.com
:method
POST
:path
/results
:scheme
https
accept
application/json
accept-encoding
gzip, deflate, br, zstd
accept-language
en-US,en;q=0.7
authorization
Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6IjM3MzAwNzY5YTA3ZTA1MTE2ZjdlNTEzOGZhOTA5MzY4NWVlYmMyNDAiLCJ0eXAiOiJKV1QifQ.eyJuYW1lIjoiWmVuaXRoIEthbmRlbCIsInBpY3R1cmUiOiJodHRwczovL2xoMy5nb29nbGV1c2VyY29udGVudC5jb20vYS9BQ2c4b2NJMEhXWjlRdzFob2RyczdrQWZoX1hkblJFX2M4MFQ3T0xyYjE3aG5QTjdqejhqN2FGWD1zOTYtYyIsImlzcyI6Imh0dHBzOi8vc2VjdXJldG9rZW4uZ29vZ2xlLmNvbS9tb25rZXktdHlwZSIsImF1ZCI6Im1vbmtleS10eXBlIiwiYXV0aF90aW1lIjoxNzc0ODg0MDMzLCJ1c2VyX2lkIjoiZFFMdzlwcU5vM2U0bVdTV3hXNmdHdkd1Rlg4MyIsInN1YiI6ImRRTHc5cHFObzNlNG1XU1d4VzZnR3ZHdUZYODMiLCJpYXQiOjE3NzUwMDk4NjQsImV4cCI6MTc3NTAxMzQ2NCwiZW1haWwiOiJrYW5kZWx6ZTEyM0BnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiZmlyZWJhc2UiOnsiaWRlbnRpdGllcyI6eyJnb29nbGUuY29tIjpbIjExMDYyNzI5MDAyMDc4MDI4Njk5MyJdLCJlbWFpbCI6WyJrYW5kZWx6ZTEyM0BnbWFpbC5jb20iXX0sInNpZ25faW5fcHJvdmlkZXIiOiJwYXNzd29yZCJ9fQ.es1K6eoQrn3257JImSGWxHGAUcAc-Czgm6owqNK3SlKSAvtkDOu8w46ZmB0YEQOYkv0CXLO23gv3hiwl40GOkGz0_kobkUh990EqLAc6AJvll5_sUffPb6-_5-ufjdZvWT80W8aaxdRTjTmD4P53J9U_TeA0n2opwKyD5i6xTtH4--yS9tz-IszWucNAXuEqVnHXhH08HBpeKziLUI-bVNmzGiz1YRvAHwEYZpbOMY4MRBW8p33EA2ZK_6VvMZgxVx7kOZxkBej2joint0iEB3BsgIgrLDQl1bE_Dq0Zo1b19YdnN6IY-YNBKctB6G2qDUD_FeoVrkmutYljjTWF0A
cache-control
no-cache
content-length
3444
content-type
application/json
origin
https://monkeytype.com
pragma
no-cache
priority
u=1, i
referer
https://monkeytype.com/
sec-ch-ua
"Chromium";v="146", "Not-A.Brand";v="24", "Brave";v="146"
sec-ch-ua-mobile
?0
sec-ch-ua-platform
"Windows"
sec-fetch-dest
empty
sec-fetch-mode
cors
sec-fetch-site
same-site
sec-gpc
1
user-agent
Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36
x-client-version
2026.03.31_20.50_d51030f4e
```

in which the JSW token in the headers sent as a bearer is the core thing that we actually need.

then in the payload of the request body, we can see the following parameters:

```
{
  "result": {
    "wpm": 88.76,
    "rawWpm": 88.76,
    "charStats": [
      111,
      0,
      0,
      0
    ],
    "charTotal": 111,
    "acc": 97.39,
    "mode": "time",
    "mode2": "15",
    "punctuation": false,
    "numbers": false,
    "lazyMode": false,
    "timestamp": 1775009885711,
    "language": "english",
    "restartCount": 2,
    "incompleteTests": [
      {
        "acc": 55.56,
        "seconds": 0.23
      },
      {
        "acc": 0,
        "seconds": 0.58
      }
    ],
    "incompleteTestSeconds": 0.81,
    "difficulty": "normal",
    "blindMode": false,
    "tags": [],
    "keySpacing": [
      74,
      73.6,
      184.1,
      151.9,
      198.2,
      151.8,
      107.5,
      108.7,
      85.1,
      119.6,
      159.7,
      83.3,
      220.9,
      200.3,
      156.8,
      74.6,
      75.3,
      133.2,
      91.9,
      97.6,
      110.2,
      109.8,
      96.1,
      212.3,
      108.6,
      598.4,
      296.4,
      190.2,
      176.6,
      121.2,
      112.7,
      189,
      79.7,
      142.5,
      108.5,
      106.7,
      107.6,
      101.6,
      81,
      109,
      114.6,
      110.5,
      99.7,
      83.6,
      82.9,
      115.2,
      86.5,
      133.1,
      92.3,
      152.2,
      57.6,
      166.8,
      322.5,
      108.3,
      82.6,
      84.4,
      98,
      204.3,
      79.6,
      156.4,
      146.6,
      133.1,
      98.8,
      126.6,
      112.1,
      239.3,
      170.9,
      162.6,
      122.1,
      105.9,
      59.3,
      67.2,
      81.9,
      93.1,
      56.2,
      145.7,
      158.9,
      130.7,
      76.4,
      94.6,
      93.5,
      88.1,
      98.7,
      86.7,
      165.9,
      61.6,
      119.4,
      54.5,
      76.6,
      117.1,
      81.8,
      106.2,
      77.7,
      125.3,
      74.9,
      370.6,
      499.1,
      97.8,
      121,
      113.6,
      67.9,
      147.8,
      152.7,
      97.8,
      150.9,
      351.2,
      58.3,
      177.7,
      63,
      68.2,
      97.7,
      111.4,
      75.9,
      147,
      102.3
    ],
    "keyDuration": [
      158.20000000298023,
      128.10000000149012,
      135.70000000298023,
      233.10000000149012,
      225.39999999850988,
      82.29999999701977,
      147.20000000298023,
      175.60000000149012,
      202.10000000149012,
      163.19999999552965,
      109.10000000149012,
      170.20000000298023,
      110.10000000149012,
      148.39999999850988,
      127.60000000149012,
      137,
      101.70000000298023,
      105.39999999850988,
      157.20000000298023,
      113.70000000298023,
      132.39999999850988,
      205.69999999552965,
      127.39999999850988,
      151.20000000298023,
      121.80000000447035,
      90,
      82.10000000149012,
      122.29999999701977,
      105.10000000149012,
      186.5,
      123.79999999701977,
      176,
      143.39999999850988,
      138.29999999701977,
      116.10000000149012,
      129,
      107.5,
      101.10000000149012,
      123.39999999850988,
      151.10000000149012,
      155.89999999850988,
      161.69999999552965,
      132.5,
      189.40000000596046,
      176.30000000447035,
      156.40000000596046,
      133.29999999701977,
      166.60000000149012,
      153.69999999552965,
      179.89999999850988,
      156.39999999850988,
      192.89999999850988,
      102.60000000149012,
      156.79999999701977,
      153.90000000596046,
      101.20000000298023,
      129,
      88.60000000149012,
      152.19999999552965,
      238.39999999850988,
      177.39999999850988,
      130.89999999850988,
      246.60000000149012,
      148.39999999850988,
      169.39999999850988,
      132,
      131.89999999850988,
      187.89999999850988,
      103.69999999552965,
      185.59999999403954,
      156.19999999552965,
      215.30000000447035,
      148.79999999701977,
      149.20000000298023,
      96.39999999850988,
      217.40000000596046,
      186.79999999701977,
      82.20000000298023,
      169.19999999552965,
      172.39999999850988,
      142.89999999850988,
      125.10000000149012,
      201.5,
      153.89999999850988,
      95.79999999701977,
      130.5,
      140.89999999850988,
      136.5,
      147.60000000149012,
      126.5,
      149.29999999701977,
      105.89999999850988,
      144,
      172.10000000149012,
      110.79999999701977,
      86.69999999552965,
      102.59999999403954,
      115.20000000298023,
      119.10000000149012,
      139.10000000149012,
      215.5,
      131.10000000149012,
      152.39999999850988,
      103.5,
      195.60000000149012,
      84,
      146.89999999850988,
      123.70000000298023,
      116.79999999701977,
      174.89999999850988,
      146.69999999552965,
      134.70000000298023,
      105.60000000149012,
      162.69999999552965,
      117.5,
      144.42
    ],
    "keyOverlap": 4342.4,
    "lastKeyToEnd": 0,
    "startToFirstKey": 0,
    "consistency": 71.56,
    "wpmConsistency": 93.54,
    "keyConsistency": 39.42,
    "funbox": [],
    "bailedOut": false,
    "chartData": {
      "wpm": [
        95,
        90,
        96,
        75,
        77,
        82,
        87,
        87,
        87,
        89,
        91,
        93,
        88,
        87,
        89
      ],
      "burst": [
        96,
        84,
        108,
        36,
        84,
        108,
        120,
        84,
        84,
        108,
        108,
        132,
        36,
        84,
        108
      ],
      "err": [
        0,
        0,
        0,
        1,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        1,
        1,
        0,
        0
      ]
    },
    "testDuration": 15.01,
    "afkDuration": 0,
    "stopOnLetter": false,
    "uid": "dQLw9pqNo3e4mWSWxW6gGvGuFX83",
    "hash": "2b753ee6163e701da87d50f460eed0680d27fbc1"
  }
}
```

in which each field has the following meaning
| S.N | Field | Subfield | Data Type | Importance |
| --- | --------- | --------------------- | ----------------- | ---------------------------------- |
| 1 | result | wpm | float (2 decimal) | Core typing performance metric |
| 2 | result | rawWpm | float (2 decimal) | Raw speed without corrections |
| 3 | result | charStats | array[int] | Typing accuracy breakdown |
| 4 | result | charTotal | int | Total characters typed |
| 5 | result | acc | float (2 decimal) | Accuracy percentage |
| 6 | result | mode | string | Test configuration |
| 7 | result | mode2 | string | Test duration/detail |
| 8 | result | punctuation | boolean | Test setting |
| 9 | result | numbers | boolean | Test setting |
| 10 | result | lazyMode | boolean | Test behavior setting |
| 11 | result | timestamp | int (epoch ms) | Verification / logging |
| 12 | result | language | string | Test configuration |
| 13 | result | restartCount | int | User behavior tracking |
| 14 | result | incompleteTests | array[object] | Behavior / retry analysis |
| 15 | result | incompleteTestSeconds | float | Behavior tracking |
| 16 | result | difficulty | string | Test configuration |
| 17 | result | blindMode | boolean | Test setting |
| 18 | result | tags | array[string] | Metadata / categorization |
| 19 | result | keySpacing | array[float] | Typing rhythm analysis |
| 20 | result | keyDuration | array[float] | Key press timing |
| 21 | result | keyOverlap | float | Typing style (overlap) |
| 22 | result | lastKeyToEnd | int | Timing metric |
| 23 | result | startToFirstKey | int | Reaction time |
| 24 | result | consistency | float (2 decimal) | Overall typing consistency |
| 25 | result | wpmConsistency | float (2 decimal) | Speed stability |
| 26 | result | keyConsistency | float (2 decimal) | Keystroke stability |
| 27 | result | funbox | array | Feature flags / extras |
| 28 | result | bailedOut | boolean | Test completion status |
| 29 | result | chartData | object | Visualization data |
| 30 | chartData | wpm | array[int] | Speed trend over time |
| 31 | chartData | burst | array[int] | Speed bursts |
| 32 | chartData | err | array[int] | Error trend |
| 33 | result | testDuration | float | Total test time |
| 34 | result | afkDuration | int | Idle time tracking |
| 35 | result | stopOnLetter | boolean | Test setting |
| 36 | result | uid | string | User identification (verification) |
| 37 | result | hash | string | Data integrity / anti-cheat |

based on the available data, we can conclude that if we send this post request to the API by modifying the data then we should successfully be able to perform replay attacks on the monkeytype system. although they have an anticheat to detect if the data is humanly or not, if we use a good AI model to form all the fields and their data which mimics a good typists analytics, we can perform replay attack and feed false data in to our account stats.

to prove my point, i would want you to make a HTML CSS JS and PHP based platform where we have a multiple input fields for each and every data field required, we also ask for the JSW bearer token as well as every thing else. then we give the user an option to load the data from a json file as well and when the user uploads a json file, load all the available data in the json file and then if some fields are missing then tell the user that they manually have to enter the data in those field. and then for the places having the timestamp required, use the timestamp of the time of form submission, although let the user to let input the timestamp manually, keep an option to generate timestamp automatically as well. then after making the request, the response will be shown to the use. also make the UI look good, simple and minimal. use yellow accent in a dark themed background and use typewriter like mono fonts. all the best. you are free to ask any questions.

this GitHub repository (https://github.com/monkeytypegame/monkeytype) has all the frontend and backend code for monkeytype as it is an opensource project, you must read it to understand what does each parameter mean and how is the request being processed and everything.

i have kept the files from that repository in the /monkeytype folder in the workspace as well.
