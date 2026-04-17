import { IsULID } from '../../../common/validators/index.js';

/**
 * DTO gan agent xu ly conversation — admin chon staff user.
 */
export class AssignAgentDto {
  @IsULID()
  agentId: string;
}
