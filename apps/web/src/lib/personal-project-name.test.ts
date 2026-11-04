import { describe, expect, it } from "vite-plus/test";
import {
  withPersonalProjectName,
  withPersonalSearchResult,
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

  it("relabels a personal search hit by what it is", () => {
    expect(
      withPersonalSearchResult(
        { type: "project", isPersonal: true, title: "Personal" },
        "Persönlich",
      ).title,
    ).toBe("Persönlich");
    expect(
      withPersonalSearchResult(
        {
          type: "task",
          isPersonal: true,
          title: "Passport",
          projectName: "Personal",
        },
        "Persönlich",
      ),
    ).toMatchObject({ title: "Passport", projectName: "Persönlich" });
    const team = { type: "task", title: "Ship", projectName: "Website" };
    expect(withPersonalSearchResult(team, "Persönlich")).toBe(team);
  });
});
