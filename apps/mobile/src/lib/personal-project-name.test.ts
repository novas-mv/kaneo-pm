import { describe, expect, it } from "vite-plus/test";
import {
  withPersonalProjectName,
  withPersonalTaskProjectName,
} from "./personal-project-name";

describe("personal project names", () => {
  it("replaces the stored name for a personal project only", () => {
    expect(
      withPersonalProjectName(
        { ownerUserId: "u1", name: "Personal" },
        "Persönlich",
      ).name,
    ).toBe("Persönlich");
    const team = { ownerUserId: null, name: "Website" };
    expect(withPersonalProjectName(team, "Persönlich")).toBe(team);
  });

  it("replaces the project name on a personal task only", () => {
    expect(
      withPersonalTaskProjectName(
        { isPersonal: true, projectName: "Personal" },
        "Persönlich",
      ).projectName,
    ).toBe("Persönlich");
    const work = { isPersonal: false, projectName: "Website" };
    expect(withPersonalTaskProjectName(work, "Persönlich")).toBe(work);
  });
});
