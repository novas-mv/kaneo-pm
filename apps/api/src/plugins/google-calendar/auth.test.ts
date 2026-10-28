import {
  createPublicKey,
  createVerify,
  generateKeyPairSync,
} from "node:crypto";
import { expect, it } from "vite-plus/test";
import { readServiceAccount, signAssertion } from "./auth";

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});
const key = JSON.stringify({
  client_email: "robot@project.iam.gserviceaccount.com",
  private_key: privateKey,
});

it("reads the key as JSON or base64 and rejects anything else", () => {
  const account = readServiceAccount(key);
  expect(account?.client_email).toBe("robot@project.iam.gserviceaccount.com");
  expect(readServiceAccount(Buffer.from(key).toString("base64"))).toEqual(
    account,
  );
  expect(readServiceAccount("")).toBeNull();
  expect(readServiceAccount("not a key")).toBeNull();
  expect(readServiceAccount('{"client_email":"x"}')).toBeNull();
});

it("signs a verifiable RS256 assertion for the calendar scope", () => {
  const account = readServiceAccount(key);
  if (!account) throw new Error("expected an account");
  const [header = "", claims = "", signature = ""] = signAssertion(
    account,
    1000,
  ).split(".");

  const verified = createVerify("RSA-SHA256")
    .update(`${header}.${claims}`)
    .verify(createPublicKey(publicKey), Buffer.from(signature, "base64url"));
  expect(verified).toBe(true);

  const payload = JSON.parse(Buffer.from(claims, "base64url").toString());
  expect(payload).toMatchObject({
    iss: "robot@project.iam.gserviceaccount.com",
    scope: "https://www.googleapis.com/auth/calendar.events",
    iat: 1000,
    exp: 4600,
  });
});
