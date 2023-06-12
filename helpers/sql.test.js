const { sqlForPartialUpdate } = require('./sql');

describe("sqlForPartialUpdate", () => {
    test("works for updating 1 item", () => {
        const result = sqlForPartialUpdate (
            { obj1: "ver1"},
            { obj1: "obj1", obj2: "obj2" }
        );
        expect(result).toEqual({
            setCols: "\"obj1\"=$1",
            values: ["ver1"],
        })
    });

    test("works for updating 2 items", () => {
        const result = sqlForPartialUpdate(
            { obj1: "ver1", obj2: "ver2" },
            { obj2: "ver2" });
        expect(result).toEqual({
          setCols: "\"obj1\"=$1, \"ver2\"=$2",
          values: ["ver1", "ver2"],
        });
    });
});