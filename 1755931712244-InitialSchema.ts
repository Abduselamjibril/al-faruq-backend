import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1755931712244 implements MigrationInterface {
    name = 'InitialSchema1755931712244'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "pricing_tier" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "basePrice" numeric(10,2) NOT NULL, "baseDurationDays" integer NOT NULL DEFAULT '15', "additionalTiers" jsonb, "contentId" uuid, CONSTRAINT "REL_3eea64a310bfb7a08378ad7da5" UNIQUE ("contentId"), CONSTRAINT "PK_3f9adbf9491df3fc587ba4be2b2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."content_type_enum" AS ENUM('MOVIE', 'MUSIC_VIDEO', 'SERIES', 'SEASON', 'EPISODE')`);
        await queryRunner.query(`CREATE TABLE "content" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying NOT NULL, "description" text, "thumbnailUrl" character varying, "videoUrl" character varying, "trailerUrl" character varying, "duration" integer, "type" "public"."content_type_enum" NOT NULL, "isLocked" boolean NOT NULL DEFAULT false, "parentId" uuid, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_6a2083913f3647b44f205204e36" PRIMARY KEY ("id")); COMMENT ON COLUMN "content"."duration" IS 'Duration in seconds'`);
        await queryRunner.query(`CREATE INDEX "IDX_b9b0eb0c1e1e5f61a56ef072bc" ON "content" ("type") `);
        await queryRunner.query(`CREATE INDEX "IDX_6120f2bd445c962b67f96853c1" ON "content" ("isLocked") `);
        await queryRunner.query(`CREATE INDEX "IDX_d7e616263caccbc4dfd1a1b3c3" ON "content" ("parentId") `);
        await queryRunner.query(`CREATE TABLE "purchase" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL, "pricePaid" numeric(10,2) NOT NULL, "chapaTransactionId" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" integer, "contentId" uuid, CONSTRAINT "UQ_fe1762becc6cf3724be43412be8" UNIQUE ("chapaTransactionId"), CONSTRAINT "PK_86cc2ebeb9e17fc9c0774b05f69" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_4f34538ec9116c97fb05ef87c7" ON "purchase" ("userId", "contentId", "expiresAt") `);
        await queryRunner.query(`CREATE TYPE "public"."user_authprovider_enum" AS ENUM('LOCAL', 'GOOGLE', 'FACEBOOK')`);
        await queryRunner.query(`CREATE TABLE "user" ("id" SERIAL NOT NULL, "firstName" character varying, "lastName" character varying, "phoneNumber" character varying NOT NULL, "email" character varying, "password" character varying, "agreedToTerms" boolean NOT NULL DEFAULT false, "authProvider" "public"."user_authprovider_enum" NOT NULL DEFAULT 'LOCAL', "googleId" character varying, "facebookId" character varying, "otp" character varying, "otpExpiresAt" TIMESTAMP, CONSTRAINT "UQ_f2578043e491921209f5dadd080" UNIQUE ("phoneNumber"), CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE ("email"), CONSTRAINT "UQ_470355432cc67b2c470c30bef7c" UNIQUE ("googleId"), CONSTRAINT "UQ_7989eba4dafdd5322761765f2b8" UNIQUE ("facebookId"), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "pending_transaction" ("tx_ref" character varying NOT NULL, "durationDays" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_88d066ec6c7b4ee66c665dbc909" PRIMARY KEY ("tx_ref"))`);
        await queryRunner.query(`CREATE INDEX "IDX_ac23464c4b29c7f0296d747f15" ON "pending_transaction" ("createdAt") `);
        await queryRunner.query(`ALTER TABLE "pricing_tier" ADD CONSTRAINT "FK_3eea64a310bfb7a08378ad7da52" FOREIGN KEY ("contentId") REFERENCES "content"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "content" ADD CONSTRAINT "FK_d7e616263caccbc4dfd1a1b3c39" FOREIGN KEY ("parentId") REFERENCES "content"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "purchase" ADD CONSTRAINT "FK_33520b6c46e1b3971c0a649d38b" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "purchase" ADD CONSTRAINT "FK_0568533c1bc97517c84aeb3a9d5" FOREIGN KEY ("contentId") REFERENCES "content"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "purchase" DROP CONSTRAINT "FK_0568533c1bc97517c84aeb3a9d5"`);
        await queryRunner.query(`ALTER TABLE "purchase" DROP CONSTRAINT "FK_33520b6c46e1b3971c0a649d38b"`);
        await queryRunner.query(`ALTER TABLE "content" DROP CONSTRAINT "FK_d7e616263caccbc4dfd1a1b3c39"`);
        await queryRunner.query(`ALTER TABLE "pricing_tier" DROP CONSTRAINT "FK_3eea64a310bfb7a08378ad7da52"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ac23464c4b29c7f0296d747f15"`);
        await queryRunner.query(`DROP TABLE "pending_transaction"`);
        await queryRunner.query(`DROP TABLE "user"`);
        await queryRunner.query(`DROP TYPE "public"."user_authprovider_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4f34538ec9116c97fb05ef87c7"`);
        await queryRunner.query(`DROP TABLE "purchase"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d7e616263caccbc4dfd1a1b3c3"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6120f2bd445c962b67f96853c1"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b9b0eb0c1e1e5f61a56ef072bc"`);
        await queryRunner.query(`DROP TABLE "content"`);
        await queryRunner.query(`DROP TYPE "public"."content_type_enum"`);
        await queryRunner.query(`DROP TABLE "pricing_tier"`);
    }

}
