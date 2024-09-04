import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { IsMongoId, IsNotEmpty } from 'class-validator';

export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['password'] as const),
) {
  @IsMongoId({ message: '_id không hợp lệ' })
  @IsNotEmpty({ message: '_id không được để trống' })
  _id: string;
}
