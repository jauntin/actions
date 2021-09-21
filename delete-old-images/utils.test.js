const { jest, describe, test, expect } = require("@jest/globals");
const utils = require("./utils");

describe("olderThanSeconds", () => {
  test("should delete when older than cutoff", () => {
    jest
      .spyOn(global.Date, "now")
      .mockImplementation(() => new Date("2021-01-01T12:00:00.00Z"));
    // Now is not older than one second
    expect(utils.olderThanSeconds("2021-01-01T12:00:00.00Z", 1)).toBe(false);
    // One second ago is older than one second (gt comparison)
    expect(utils.olderThanSeconds("2021-01-01T11:59:59.00Z", 1)).toBe(false);
    // Two seconds ago is older than one second
    expect(utils.olderThanSeconds("2021-01-01T11:59:58.00Z", 1)).toBe(true);
    // On hour and 1 second ago is older than one hour
    expect(utils.olderThanSeconds("2021-01-01T10:59:59.00Z", 3600)).toBe(true);
  });
});
