let a;
// plain
a = `aa${'bb'}cc`;
a = `${33}${'cc'}dd`;
a = `aa${a}${foo()}`;
// with inline expression
a = `aa${1 + 2 + 3}bb${1 + 2 + '3'}${1 + '2' + 3}`;
a = `${1 + 2 + a + 3}`;
a = `aa${'bb' + 3 + foo()}`;
// with expression
a = `aa${'bb'}` + 'cc' + 'dd' + 33;
a = `aa${'bb'}` + 'cc' + `dd` + 33;
a = `aa${'bb'}` + `cc` + 'dd' + 33;
a = `aa${foo()}` + 'cc';
// with escape
a = 'aa\n\r' + `bb\n\r`;
a = `${a + '\n'}`;
// with nesting
a = `aa${`bb`}`;
a = `${`aa${`bb${`cc`}`}`}`;
a = `aa${`bb\n\r${'cc' + 'dd\n\r'}`}`;