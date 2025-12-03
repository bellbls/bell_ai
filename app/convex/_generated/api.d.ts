/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as accounts from "../accounts.js";
import type * as addressBook from "../addressBook.js";
import type * as admin from "../admin.js";
import type * as adminAlerts from "../adminAlerts.js";
import type * as adminMutations from "../adminMutations.js";
import type * as auth from "../auth.js";
import type * as auth_emailVerification from "../auth/emailVerification.js";
import type * as auth_passwordReset from "../auth/passwordReset.js";
import type * as auth_testEmailVerification from "../auth/testEmailVerification.js";
import type * as blockchainSync from "../blockchainSync.js";
import type * as blockchainSyncTests from "../blockchainSyncTests.js";
import type * as bls from "../bls.js";
import type * as brankMigrations from "../brankMigrations.js";
import type * as config from "../config.js";
import type * as configs from "../configs.js";
import type * as contractInfo from "../contractInfo.js";
import type * as crons from "../crons.js";
import type * as depositAddress from "../depositAddress.js";
import type * as depositListener from "../depositListener.js";
import type * as depositTests from "../depositTests.js";
import type * as errors from "../errors.js";
import type * as initHelpers from "../initHelpers.js";
import type * as inspect_user from "../inspect_user.js";
import type * as integration_depositIntegrationTests from "../integration/depositIntegrationTests.js";
import type * as lowBalanceMonitor from "../lowBalanceMonitor.js";
import type * as migrations from "../migrations.js";
import type * as migrations_migrateToMultiAccount from "../migrations/migrateToMultiAccount.js";
import type * as multiNetworkDepositListener from "../multiNetworkDepositListener.js";
import type * as networkManagement from "../networkManagement.js";
import type * as notifications from "../notifications.js";
import type * as presale from "../presale.js";
import type * as rankHelpers from "../rankHelpers.js";
import type * as rankQueries from "../rankQueries.js";
import type * as ranks from "../ranks.js";
import type * as reports_commissionReports from "../reports/commissionReports.js";
import type * as reports_comprehensiveStakeReport from "../reports/comprehensiveStakeReport.js";
import type * as reports_exportService from "../reports/exportService.js";
import type * as reports_stakeAnalytics from "../reports/stakeAnalytics.js";
import type * as reports_stakeExport from "../reports/stakeExport.js";
import type * as reports_stakeExportComprehensive from "../reports/stakeExportComprehensive.js";
import type * as reports_stakeReports from "../reports/stakeReports.js";
import type * as reports_testData from "../reports/testData.js";
import type * as rewards from "../rewards.js";
import type * as security_inputValidator from "../security/inputValidator.js";
import type * as security_rateLimiter from "../security/rateLimiter.js";
import type * as security_twoFactor from "../security/twoFactor.js";
import type * as security_withdrawalSecurity from "../security/withdrawalSecurity.js";
import type * as stakes from "../stakes.js";
import type * as temp_admin from "../temp_admin.js";
import type * as testBRankCapping from "../testBRankCapping.js";
import type * as testUnilevel from "../testUnilevel.js";
import type * as test_helpers from "../test_helpers.js";
import type * as test_helpers_depositTestHelpers from "../test_helpers/depositTestHelpers.js";
import type * as twoFactorActions from "../twoFactorActions.js";
import type * as unilevel_activeDirectsCalculator from "../unilevel/activeDirectsCalculator.js";
import type * as unilevel_commissionDistributor from "../unilevel/commissionDistributor.js";
import type * as unilevel_commissionRates from "../unilevel/commissionRates.js";
import type * as unilevel_uplineFinder from "../unilevel/uplineFinder.js";
import type * as users from "../users.js";
import type * as wallet from "../wallet.js";
import type * as walletActions from "../walletActions.js";
import type * as withdrawalBLSTests from "../withdrawalBLSTests.js";
import type * as withdrawalExecuter from "../withdrawalExecuter.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  accounts: typeof accounts;
  addressBook: typeof addressBook;
  admin: typeof admin;
  adminAlerts: typeof adminAlerts;
  adminMutations: typeof adminMutations;
  auth: typeof auth;
  "auth/emailVerification": typeof auth_emailVerification;
  "auth/passwordReset": typeof auth_passwordReset;
  "auth/testEmailVerification": typeof auth_testEmailVerification;
  blockchainSync: typeof blockchainSync;
  blockchainSyncTests: typeof blockchainSyncTests;
  bls: typeof bls;
  brankMigrations: typeof brankMigrations;
  config: typeof config;
  configs: typeof configs;
  contractInfo: typeof contractInfo;
  crons: typeof crons;
  depositAddress: typeof depositAddress;
  depositListener: typeof depositListener;
  depositTests: typeof depositTests;
  errors: typeof errors;
  initHelpers: typeof initHelpers;
  inspect_user: typeof inspect_user;
  "integration/depositIntegrationTests": typeof integration_depositIntegrationTests;
  lowBalanceMonitor: typeof lowBalanceMonitor;
  migrations: typeof migrations;
  "migrations/migrateToMultiAccount": typeof migrations_migrateToMultiAccount;
  multiNetworkDepositListener: typeof multiNetworkDepositListener;
  networkManagement: typeof networkManagement;
  notifications: typeof notifications;
  presale: typeof presale;
  rankHelpers: typeof rankHelpers;
  rankQueries: typeof rankQueries;
  ranks: typeof ranks;
  "reports/commissionReports": typeof reports_commissionReports;
  "reports/comprehensiveStakeReport": typeof reports_comprehensiveStakeReport;
  "reports/exportService": typeof reports_exportService;
  "reports/stakeAnalytics": typeof reports_stakeAnalytics;
  "reports/stakeExport": typeof reports_stakeExport;
  "reports/stakeExportComprehensive": typeof reports_stakeExportComprehensive;
  "reports/stakeReports": typeof reports_stakeReports;
  "reports/testData": typeof reports_testData;
  rewards: typeof rewards;
  "security/inputValidator": typeof security_inputValidator;
  "security/rateLimiter": typeof security_rateLimiter;
  "security/twoFactor": typeof security_twoFactor;
  "security/withdrawalSecurity": typeof security_withdrawalSecurity;
  stakes: typeof stakes;
  temp_admin: typeof temp_admin;
  testBRankCapping: typeof testBRankCapping;
  testUnilevel: typeof testUnilevel;
  test_helpers: typeof test_helpers;
  "test_helpers/depositTestHelpers": typeof test_helpers_depositTestHelpers;
  twoFactorActions: typeof twoFactorActions;
  "unilevel/activeDirectsCalculator": typeof unilevel_activeDirectsCalculator;
  "unilevel/commissionDistributor": typeof unilevel_commissionDistributor;
  "unilevel/commissionRates": typeof unilevel_commissionRates;
  "unilevel/uplineFinder": typeof unilevel_uplineFinder;
  users: typeof users;
  wallet: typeof wallet;
  walletActions: typeof walletActions;
  withdrawalBLSTests: typeof withdrawalBLSTests;
  withdrawalExecuter: typeof withdrawalExecuter;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
