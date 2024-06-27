let a;
// plain
a = "aabbcc";
a = "33ccdd";
a = `aa${a}${foo()}`;
// with inline expression
a = "aa6bb33123";
a = `${3 + a + 3}`;
a = `aa${"bb3" + foo()}`;
// with expression
a = "aabbccdd33";
a = "aabbccdd33";
a = "aabbccdd33";
a = `aa${foo()}cc`;
// with escape
a = "aa\n\rbb\n\r";
a = `${a + '\n'}`;
// with nesting
a = "aabb";
a = "aabbcc";
a = "aabb\n\rccdd\n\r";