import { getAddress } from '@ethersproject/address';
import { BlockTag } from '@ethersproject/abstract-provider';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { Inject, Injectable, LoggerService } from '@nestjs/common';

import { Csm, Csm__factory } from './types';
import { ConfigService } from '../config/config.service';
import { KeyInfo } from '../prover/types';
import { Execution } from '../providers/execution/execution';

@Injectable()
export class CsmContract {
  private contract: Csm;

  constructor(
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,
    protected readonly config: ConfigService,
    protected readonly execution: Execution,
  ) {
    const address = this.config.get('CSM_ADDRESS');
    this.logger.log(`CSModule address: ${address}`);
    this.contract = Csm__factory.connect(address, this.execution.provider);
  }

  public async getInitializedVersion(): Promise<number> {
    try {
      return (await this.contract.getInitializedVersion()).toNumber();
    } catch (e: any) {
      if (e?.code === 'CALL_EXCEPTION') {
        return 1;
      }
      throw e;
    }
  }

  public async isWithdrawalProved(blockTag: BlockTag, keyInfo: KeyInfo): Promise<boolean> {
    return await this.contract.isValidatorWithdrawn(keyInfo.operatorId, keyInfo.keyIndex, { blockTag });
  }

  public async getNodeOperatorKey(nodeOperatorId: string | number, keyIndex: string | number): Promise<string> {
    return await this.contract.getSigningKeys(nodeOperatorId, keyIndex, 1);
  }

  public async getAccountingAddress(): Promise<string> {
    try {
      return await this.contract.accounting();
    } catch (e: any) {
      if (e?.code !== 'CALL_EXCEPTION') {
        throw e;
      }
    }

    // CMv2/curated modules expose ACCOUNTING() instead of accounting().
    const raw = await this.execution.provider.call({
      to: this.contract.address,
      data: '0x6dc3f2bd',
    });

    if (!raw || raw === '0x' || raw.length < 66) {
      throw new Error('Failed to read ACCOUNTING() from module');
    }

    return getAddress(`0x${raw.slice(-40)}`);
  }

  public async getParamsAddress(): Promise<string> {
    return await this.contract.PARAMETERS_REGISTRY();
  }

  public async getVerifierRoleMembers(): Promise<string[]> {
    const members: string[] = [];
    const role = await this.contract.VERIFIER_ROLE();
    const membersCount = (await this.contract.getRoleMemberCount(role)).toNumber();
    for (let i = 0; i < membersCount; i++) {
      const address = await this.contract.getRoleMember(role, i);
      members.push(address);
    }
    return members;
  }
}
