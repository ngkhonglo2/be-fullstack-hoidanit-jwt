import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User } from './schemas/user.schema';
import { Model } from 'mongoose';
import { hashPasswordHelper } from '@/helpers/util';
import aqp from 'api-query-params';
import mongoose from 'mongoose';
import { CodeAuthDto, CreateAuthDto } from '../auth/dto/create-auth.dto';
import { v4 as uuidv4 } from 'uuid';
import * as dayjs from 'dayjs';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private readonly mailerService: MailerService,
  ) {}

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
  }

  async handleRegister(registerDto: CreateAuthDto) {
    //check email
    const isExist = await this.isEmailExist(registerDto.email);

    if (isExist) {
      throw new BadRequestException(`Email đã tồn tại: ${registerDto.email}`);
    }
    // hash password
    const hashPassword = await hashPasswordHelper(registerDto.password);
    const codeId = uuidv4();
    const user = await this.userModel.create({
      ...registerDto,
      password: hashPassword,
      isActive: false,
      codeId: codeId,
      codeExpired: dayjs().add(5, 'minutes'),
    });

    //send email
    this.mailerService.sendMail({
      to: user.email, // list of receivers
      subject: 'Activate your account at @PHONGNT', // Subject line
      // html: '<b>welcome</b>', // HTML body content
      template: 'register.hbs',
      context: {
        name: user.name ?? user.email,
        activationCode: codeId,
      },
    });
    // trả ra phản hồi
    return {
      _id: user._id,
    };
  }

  async handleActive(codeAuthrDto: CodeAuthDto) {
    const user = await this.userModel.findOne({
      _id: codeAuthrDto._id,
      codeId: codeAuthrDto.code,
    });

    if (!user) {
      throw new BadRequestException('Mã code không hợp lệ hoặc hết hạn');
    }

    //check code expire

    const isBeforeCheck = dayjs().isBefore(user.codeExpired);
    if (isBeforeCheck) {
      //valid
      await this.userModel.updateOne(
        { _id: codeAuthrDto._id },
        { isActive: true },
      );
      return { isBeforeCheck };
    } else {
      throw new BadRequestException('Mã code đã hết hạn');
    }
  }

  async retryActive(email: string) {
    const codeId = uuidv4();
    const user = await this.userModel.findOne({ email });

    if (!user) {
      throw new BadRequestException('Tài khoản không tồn tại');
    }
    if (user.isActive) {
      throw new BadRequestException('Tài khoản đã tồn taij');
    }

    // update user trước
    await this.userModel.updateOne(
      { _id: user._id },
      { codeId: codeId, codeExpired: dayjs().add(5, 'minutes') },
    );
    //resend email
    this.mailerService.sendMail({
      to: user.email, // list of receivers
      subject: 'Activate your account at @PHONGNT', // Subject line
      // html: '<b>welcome</b>', // HTML body content
      template: 'register.hbs',
      context: {
        name: user.name ?? user.email,
        activationCode: codeId,
      },
    });
    return { _id: user._id };
  }
}
