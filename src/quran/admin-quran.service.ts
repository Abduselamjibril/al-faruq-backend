// ...existing code...

@Injectable()
export class AdminQuranService {
  // ...existing code...

  async findAllTafsirs(): Promise<Tafsir[]> {
    return this.tafsirRepository.find({
      relations: ['surah', 'surah.juz', 'reciter', 'language'],
      order: { id: 'DESC' },
    });
  }
// src/quran/admin-quran.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateReciterDto } from './dto/create-reciter.dto';
import { CreateTafsirDto } from './dto/create-tafsir.dto';
import { UpdateReciterDto } from './dto/update-reciter.dto';
import { UpdateTafsirDto } from './dto/update-tafsir.dto';
import { Reciter } from './entities/reciter.entity';
import { Tafsir } from './entities/tafsir.entity';

@Injectable()
export class AdminQuranService {
  constructor(
    @InjectRepository(Reciter)
    private readonly reciterRepository: Repository<Reciter>,
    @InjectRepository(Tafsir)
    private readonly tafsirRepository: Repository<Tafsir>,
  ) {}

  // --- Reciter Management ---
  createReciter(createReciterDto: CreateReciterDto) {
    const reciter = this.reciterRepository.create(createReciterDto);
    return this.reciterRepository.save(reciter);
  }

  findAllReciters() {
    return this.reciterRepository.find({ order: { name: 'ASC' } });
  }

  async updateReciter(id: string, updateReciterDto: UpdateReciterDto) {
    const reciter = await this.reciterRepository.preload({
      id,
      ...updateReciterDto,
    });
    if (!reciter) {
      throw new NotFoundException(`Reciter with ID ${id} not found.`);
    }
    return this.reciterRepository.save(reciter);
  }

  async removeReciter(id: string) {
    const reciter = await this.reciterRepository.findOneBy({ id });
    if (!reciter) {
      throw new NotFoundException(`Reciter with ID ${id} not found.`);
    }
    await this.reciterRepository.remove(reciter);
    return { message: 'Reciter successfully deleted.' };
  }

  // --- Tafsir Management ---
  async createTafsir(createTafsirDto: CreateTafsirDto): Promise<Tafsir> {
    const tafsir = this.tafsirRepository.create(createTafsirDto);
    const savedTafsir = await this.tafsirRepository.save(tafsir);

    // Fetch the newly created tafsir with all its relations to return a complete object
    return this.tafsirRepository.findOneOrFail({
      where: { id: savedTafsir.id },
      relations: ['surah', 'surah.juz', 'reciter', 'language'],
    });
  }

  async updateTafsir(
    id: string,
    updateTafsirDto: UpdateTafsirDto,
  ): Promise<Tafsir> {
    const tafsir = await this.tafsirRepository.preload({
      id,
      ...updateTafsirDto,
    });
    if (!tafsir) {
      throw new NotFoundException(`Tafsir with ID ${id} not found.`);
    }
    const savedTafsir = await this.tafsirRepository.save(tafsir);

    // Fetch the updated tafsir with all its relations to return a complete object
    return this.tafsirRepository.findOneOrFail({
      where: { id: savedTafsir.id },
      relations: ['surah', 'surah.juz', 'reciter', 'language'],
    });
  }

  async removeTafsir(id: string) {
    const tafsir = await this.tafsirRepository.findOneBy({ id });
    if (!tafsir) {
      throw new NotFoundException(`Tafsir with ID ${id} not found.`);
    }
    await this.tafsirRepository.remove(tafsir);
    return { message: 'Tafsir successfully deleted.' };
  }
}
