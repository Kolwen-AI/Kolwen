// The MTA-STS constants (RFC 8461, LWK-220 item 1): testing mode, served on mta-sts.kolwen.com only, dark until its DNS record exists. They live in their own module
// because workerd treats every named export of the main module as an entrypoint and rejects a string one (Verify on #200). The Worker imports them; the tests import them from here.
export const MTA_STS_HOST = 'mta-sts.kolwen.com';
export const MTA_STS_PATH = '/.well-known/mta-sts.txt';
export const MTA_STS_POLICY = 'version: STSv1\r\nmode: testing\r\nmx: *.mx.cloudflare.net\r\nmax_age: 86400\r\n';
