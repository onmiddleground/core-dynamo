(async () => {
    const faker = require('faker');
    const KSUID = require('ksuid');

    const items:any[] = [];
    for (let i = 0; i < 50; i++) {
        const ksuid = KSUID.randomSync().string;
        let data:any = {};
        const type = "TEST";
        const testName = faker.music.genre();
        const passingMark = faker.datatype.number(100);
        const created = faker.date.between("04/01/2020","04/30/2021").toISOString();

        data.pk = `${type}#` + ksuid;
        data.sk = `${type}#` + ksuid;
        data.type = type;
        data.stid = ksuid;
        data.name = testName;
        data.passmrk = passingMark;
        data.cadt = created;
        data.uadt = created;
        data.GSI1pk = data.pk;
        data.GSI1sk = data.sk;
        items.push(data);
    }

    console.log(JSON.stringify(items) + "\n");
})();

