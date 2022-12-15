(() => __awaiter(this, void 0, void 0, function* () {
    const faker = require('faker');
    const KSUID = require('ksuid');
    const items = [];
    for (let i = 0; i < 50; i++) {
        const ksuid = KSUID.randomSync().string;
        let data = {};
        const type = "_ST";
        const lastName = faker.name.lastName();
        const userName = faker.internet.userName(undefined, lastName).toUpperCase();
        const email = faker.internet.email();
        const firstName = faker.name.firstName();
        const registered = faker.date.between("04/01/2020", "04/30/2021").toISOString();
        data.pk = `${type}#` + ksuid;
        data.sk = `${type}#` + ksuid;
        data.type = type;
        data.stid = ksuid;
        data.fn = firstName;
        data.ln = lastName;
        data.regdt = registered;
        data.un = userName;
        data.eml = email;
        data.GSI1pk = data.pk;
        data.GSI1sk = `${type}#REGDT#${registered}`;
        items.push(data);
    }
    console.log(JSON.stringify(items) + "\n");
}))();
//# sourceMappingURL=generate-students.js.map