#!/bin/sh

export SessionSecret=b4ds3cr3t;

# https://dev.twitter.com/apps/...
export TwitterConsumerKey=abcd3232dcba;
export TwitterConsumerSecret=1234abcdefg4321;

# https://developers.facebook.com/setup/done?id=...
export FacebookAppId=123markz321;
export FacebookAppSecret=s3t3c4st0n0my;

# https://code.google.com/apis/console/#project:...:access
export GoogleAppId=54321.apps.googleusercontent.com;
export GoogleAppSecret=pbnj-pbnj-pbnj-pbnj-pbnj;

foreman start
