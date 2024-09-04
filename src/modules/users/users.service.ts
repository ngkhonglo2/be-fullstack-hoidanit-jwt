import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User } from './schemas/user.schema';
import { Model } from 'mongoose';
import { hashPasswordHelper } from '@/helpers/util';
import aqp from 'api-query-params';
import mongoose from 'mongoose';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  isEmailExist = async (email: string) => {
    const user = await this.userModel.exists({ email });
    if (user) return true;
    return false;
  };

  async create(createUserDto: CreateUserDto) {
    //check email
    const isExist = await this.isEmailExist(createUserDto.email);

    if (isExist) {
      throw new BadRequestException(`Email đã tồn tại: ${createUserDto.email}`);
    }
    // hash password
    const hashPassword = await hashPasswordHelper(createUserDto.password);
    const createdUser = await this.userModel.create({
      ...createUserDto,
      password: hashPassword,
    });
    return {
      _id: createdUser._id,
    };
  }

  async findAll(query: string, current: number, pageSize: number) {
    const { filter, sort } = aqp(query);
    if (filter.current) delete filter.current;
    if (filter.pageSize) delete filter.pageSize;

    const totalItems = (await this.userModel.find(filter)).length;
    const totalPage = Math.ceil(totalItems / pageSize);

    const resrults = await this.userModel
      .find(filter)
      .limit(pageSize)
      .skip(totalPage)
      .select('-password')
      .sort(sort as any);
    return { resrults, total: totalItems, totalPage };
  }

  findOne(id: number) {
    return `This action returns a #${id} user`;
  }

  async findByEmail(email: string) {
    return this.userModel.findOne({ email });
  }

  async update(updateUserDto: UpdateUserDto) {
    return await this.userModel.updateOne(
      { _id: updateUserDto._id },
      { ...updateUserDto },
    );
  }

  async remove(_id: string) {
    //check id
    if (mongoose.isValidObjectId(_id)) {
      return this.userModel.deleteOne({ _id });
    } else {
      throw new BadRequestException('id không dúng định dạng mongodb');
    }
    return `This action removes a #${_id} user`;
  }
}
