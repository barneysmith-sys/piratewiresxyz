export const urlFixtures: Array<{ input: string; expected: string }> = [
  {
    input: "https://PirateWires.com/p/Hello/",
    expected: "https://piratewires.com/p/Hello",
  },
  {
    input: "https://piratewires.com/p/Hello?utm_source=x&id=9#fragment",
    expected: "https://piratewires.com/p/Hello?id=9",
  },
  {
    input: "HTTPS://Example.com:443/a/b/?fbclid=1&ref=keep",
    expected: "https://example.com/a/b?ref=keep",
  },
  {
    input: "http://Example.com:80/",
    expected: "http://example.com",
  },
];

export const invalidUrls = [
  "not a url",
  "ftp://example.com/a",
  "/relative/path",
  "https://user:pass@example.com/a",
  "https://example.com/a b",
];
