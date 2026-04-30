-- -------------------------------------------------------------
-- TablePlus 6.8.6(662)
--
-- https://tableplus.com/
--
-- Database: geo-location
-- Generation Time: 2026-04-30 15:49:01.6890
-- -------------------------------------------------------------


-- Table Definition
CREATE TABLE "public"."indonesia_villages" (
    "id" bpchar(10) NOT NULL,
    "kemendragi_code" bpchar(13) NOT NULL,
    "postal_code" bpchar(5),
    "district_id" bpchar(6) NOT NULL,
    "name" text NOT NULL,
    "timezone" text,
    "lat" text,
    "lng" text,
    "elevation" int4,
    "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp(3) NOT NULL,
    PRIMARY KEY ("id")
);

-- Table Definition
CREATE TABLE "public"."indonesia_provinces" (
    "id" bpchar(2) NOT NULL,
    "kemendagri_code" bpchar(2) NOT NULL,
    "name" text NOT NULL,
    "timezone" text,
    "lat" text,
    "lng" text,
    "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp(3) NOT NULL,
    PRIMARY KEY ("id")
);

-- Table Definition
CREATE TABLE "public"."indonesia_cities" (
    "id" bpchar(4) NOT NULL,
    "kemendragi_code" bpchar(5) NOT NULL,
    "province_id" bpchar(2) NOT NULL,
    "name" text NOT NULL,
    "timezone" text,
    "lat" text,
    "lng" text,
    "elevation" int4,
    "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp(3) NOT NULL,
    PRIMARY KEY ("id")
);

-- Table Definition
CREATE TABLE "public"."indonesia_districts" (
    "id" bpchar(6) NOT NULL,
    "kemendragi_code" bpchar(8) NOT NULL,
    "city_id" bpchar(4) NOT NULL,
    "name" text NOT NULL,
    "timezone" text,
    "lat" text,
    "lng" text,
    "elevation" int4,
    "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp(3) NOT NULL,
    PRIMARY KEY ("id")
);

ALTER TABLE "public"."indonesia_villages" ADD FOREIGN KEY ("district_id") REFERENCES "public"."indonesia_districts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Indices
CREATE UNIQUE INDEX indonesia_villages_kemendragi_code_key ON public.indonesia_villages USING btree (kemendragi_code);


-- Indices
CREATE UNIQUE INDEX indonesia_provinces_kemendagri_code_key ON public.indonesia_provinces USING btree (kemendagri_code);
ALTER TABLE "public"."indonesia_cities" ADD FOREIGN KEY ("province_id") REFERENCES "public"."indonesia_provinces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Indices
CREATE UNIQUE INDEX indonesia_cities_kemendragi_code_key ON public.indonesia_cities USING btree (kemendragi_code);
ALTER TABLE "public"."indonesia_districts" ADD FOREIGN KEY ("city_id") REFERENCES "public"."indonesia_cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Indices
CREATE UNIQUE INDEX indonesia_districts_kemendragi_code_key ON public.indonesia_districts USING btree (kemendragi_code);
