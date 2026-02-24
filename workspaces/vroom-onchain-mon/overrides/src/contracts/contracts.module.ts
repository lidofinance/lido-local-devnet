import { CHAINS } from '@lido-nestjs/constants';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from 'common/config';
import { ProviderModule } from 'common/provider';

import { ContractAddressesService } from './common/contract-addresses.service';
import { LidoLocatorService } from './common/lido-locator/lido-locator.service';
import { AccountingHashConsensusContractService } from './services/accounting-hash-consensus-contract.service';
import { AccountingOracleContractService } from './services/accounting-oracle-contract.service';
import { AragonACLContractService } from './services/aragon-acl-contract.service';
import { BurnerContractService } from './services/burner-contract.service';
import { CCRContractService } from './services/ccr-contract.service';
import { CSEjectorContractService } from './services/csejector.service';
import { CSFeeHashConsensusContractService } from './services/csfee-hash-consensus-contract.service';
import { CSFeeOracleContractService } from './services/csfee-oracle-contract.service';
import { CsmContractService } from './services/csm-contract.service';
import { CuratedContractService } from './services/curated-contract.service';
import { DepositSecurityModuleContractService } from './services/deposit-security-module-contract.service';
import { EasyTrackContractService } from './services/easy-track-contract.service';
import { ExitBusHashConsensusContractService } from './services/exitbus-hash-consensus-contract.service';
import { ExitBusOracleContractService } from './services/exitbus-oracle-contract.service';
import { LidoContractService } from './services/lido-contract.service';
import { LidoLocatorContractService } from './services/lido-locator-contract.service';
import { MevAllowListContractService } from './services/mev-allow-list-contract.service';
import { ObolSplitFactoryContractService } from './services/obol-split-factory-contract.service';
import { SanityCheckerContractService } from './services/sanity-checker-contract.service';
import { SimpleDVTContractService } from './services/simple-dvt-contract.service';
import { SplitWalletContractService } from './services/split-wallet-contract.service';
import { SsvWithFeeSplitFactoryContractService } from './services/ssv-with-fee-split-factory-contract.service';
import { SsvWithoutFeeSplitFactoryContractService } from './services/ssv-without-fee-split-factory-contract.service';
import { StakingRouterContractService } from './services/staking-router-contract.service';
import { TriggerableWithdrawalsGatewayContractService } from './services/triggerable-withdrawals-gateway-contract.service';
import { WithdrawalQueueContractService } from './services/withdrawal-queue-contract.service';
import { WithdrawalVaultContractService } from './services/withdrawal-vault-contract.service';

@Module({
  exports: [
    LidoLocatorService,
    LidoLocatorContractService,
    CCRContractService,
    StakingRouterContractService,
    CsmContractService,
    CuratedContractService,
    SimpleDVTContractService,
    ContractAddressesService,
    EasyTrackContractService,
    ObolSplitFactoryContractService,
    SsvWithoutFeeSplitFactoryContractService,
    SsvWithFeeSplitFactoryContractService,
    DepositSecurityModuleContractService,
    SanityCheckerContractService,
    MevAllowListContractService,
    ExitBusOracleContractService,
    WithdrawalQueueContractService,
    LidoContractService,
    SplitWalletContractService,
    AccountingHashConsensusContractService,
    AragonACLContractService,
    ExitBusHashConsensusContractService,
    CSFeeHashConsensusContractService,
    AccountingOracleContractService,
    CSFeeOracleContractService,
    BurnerContractService,
    TriggerableWithdrawalsGatewayContractService,
    WithdrawalVaultContractService,
    CSEjectorContractService,
  ],
  imports: [ConfigModule, ProviderModule],
  providers: [
    {
      inject: [ConfigService],
      provide: ContractAddressesService,
      useFactory(configService: ConfigService) {
        const chainId = configService.get('CHAIN_ID');
        const networkFromEnv = process.env.CONTRACT_ADDRESSES_NETWORK?.trim();

        let network: string;
        if (networkFromEnv) {
          network = networkFromEnv;
        } else if (chainId === CHAINS.Mainnet) {
          network = 'mainnet';
        } else if (chainId === CHAINS.Hoodi) {
          network = 'hoodi';
        } else {
          network = 'devnet';
        }

        return new ContractAddressesService(network);
      },
    },
    LidoLocatorService,
    LidoLocatorContractService,
    CCRContractService,
    StakingRouterContractService,
    CsmContractService,
    CuratedContractService,
    SimpleDVTContractService,
    EasyTrackContractService,
    ObolSplitFactoryContractService,
    SsvWithoutFeeSplitFactoryContractService,
    SsvWithFeeSplitFactoryContractService,
    DepositSecurityModuleContractService,
    SanityCheckerContractService,
    MevAllowListContractService,
    ExitBusOracleContractService,
    WithdrawalQueueContractService,
    LidoContractService,
    SplitWalletContractService,
    AccountingHashConsensusContractService,
    AragonACLContractService,
    ExitBusHashConsensusContractService,
    CSFeeHashConsensusContractService,
    AccountingOracleContractService,
    BurnerContractService,
    CSFeeOracleContractService,
    TriggerableWithdrawalsGatewayContractService,
    WithdrawalVaultContractService,
    CSEjectorContractService,
  ],
})
export class ContractsModule {}
